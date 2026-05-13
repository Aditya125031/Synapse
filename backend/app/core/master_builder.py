import os
from dotenv import load_dotenv

load_dotenv()

import json
import numpy as np
from sklearn.cluster import KMeans
from supabase import create_client, Client
import google.generativeai as genai
from app.db.neo4j_client import neo4j_db


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def build_master_notes(chapter_id: str, new_note_id: str = None):
    # Phase 16: Relevance Flagging
    if new_note_id:
        try:
            new_note_res = supabase.table("note_chunks").select("content").eq("note_id", new_note_id).execute()
            existing_master = supabase.table("master_notes").select("content").eq("chapter_id", chapter_id).execute()
            
            if existing_master.data and new_note_res.data:
                existing_content = "\n".join([m["content"] for m in existing_master.data])
                new_content = "\n".join([c["content"] for c in new_note_res.data])
                
                model = genai.GenerativeModel("gemini-3.1-flash-lite")
                prompt = f"Compare this new note to the existing Master Note. Does it add new, relevant information, or is it irrelevant/redundant? Return ONLY a valid JSON with `is_relevant: boolean`.\n\nMaster Note:\n{existing_content}\n\nNew Note:\n{new_content}"
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```json"): text = text[7:-3].strip()
                elif text.startswith("```"): text = text[3:-3].strip()
                
                res_json = json.loads(text)
                if not res_json.get("is_relevant", True):
                    supabase.table("notes").update({"is_flagged": True}).eq("id", new_note_id).execute()
                    print(f"Note {new_note_id} flagged as irrelevant. Skipping rebuild.")
                    return []
        except Exception as e:
            print(f"Relevance check error: {e}")

    # Phase 12: Idempotent - delete existing master notes for this chapter
    try:
        supabase.table("master_notes").delete().eq("chapter_id", chapter_id).execute()
        neo4j_db.execute_query("MATCH (m:MasterTopic {chapter_id: $chapter_id}) DETACH DELETE m", parameters={"chapter_id": chapter_id})
    except Exception as e:
        print(f"Failed to clean up old master notes: {e}")

    # Fetch all content and embedding for the given chapter from the Supabase note_chunks table.
    response = supabase.table("note_chunks").select("id, content, embedding, note_id").eq("chapter_id", chapter_id).execute()
    chunks = response.data
    
    if not chunks:
        print(f"No chunks found for chapter {chapter_id}.")
        return []
            
    # Filter out any chunks missing embeddings
    valid_chunks = [c for c in chunks if c.get("embedding")]
    if not valid_chunks:
        print("No embeddings found in the chunks.")
        return []

    embeddings = [c["embedding"] for c in valid_chunks]
    
    # Parse embeddings if they are strings (sometimes pgvector returns strings or stringified JSON)
    try:
        parsed_embeddings = []
        for e in embeddings:
            if isinstance(e, str):
                parsed_embeddings.append(json.loads(e))
            else:
                parsed_embeddings.append(e)
        X = np.array(parsed_embeddings)
    except Exception as e:
        print(f"Error parsing embeddings: {e}")
        X = np.array(embeddings)
        
    # Use a lightweight clustering algorithm (e.g., KMeans)
    n_samples = X.shape[0]
    n_clusters = max(1, min(n_samples // 5, 10)) # Target ~5 chunks per cluster, max 10 clusters
    
    if n_clusters > n_samples:
        n_clusters = n_samples
        
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)
    
    clusters = {}
    for idx, label in enumerate(labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(valid_chunks[idx])
        
    master_notes_inserted = []
    
    model = genai.GenerativeModel("gemini-3.1-flash-lite")
    
    for label, cluster_chunks in clusters.items():
        combined_text = "\n\n".join([c["content"] for c in cluster_chunks])
        prompt = f"Synthesize these student notes into a single accurate Master Note paragraph. Discard inaccuracies.\n\nNotes:\n{combined_text}"
        
        try:
            synthesis = model.generate_content(prompt)
            master_content = synthesis.text.strip()
            
            # FIXED: Insert using chapter_id
            insert_data = {
                "chapter_id": chapter_id,
                "content": master_content
            }
            res = supabase.table("master_notes").insert(insert_data).execute()
            
            if res.data:
                master_id = res.data[0]["id"]
                master_notes_inserted.append(res.data[0])
                
                # Get master content embedding
                master_emb = None
                try:
                    master_embed_res = genai.embed_content(
                        model="models/gemini-embedding-001",
                        content=master_content,
                        task_type="retrieval_document",
                        output_dimensionality=768
                    )
                    master_emb = np.array(master_embed_res["embedding"])
                except Exception as e:
                    print(f"Master embedding error: {e}")
                
                for chunk in cluster_chunks:
                    note_id = chunk.get("note_id")
                    if not note_id: continue
                    
                    weight = 1.0
                    if master_emb is not None and chunk.get("embedding"):
                        try:
                            chunk_emb = np.array(chunk["embedding"]) if not isinstance(chunk["embedding"], str) else np.array(json.loads(chunk["embedding"]))
                            similarity = float(np.dot(master_emb, chunk_emb) / (np.linalg.norm(master_emb) * np.linalg.norm(chunk_emb)))
                            weight = max(0.1, min(1.0, similarity))
                        except Exception:
                            pass
                    
                    query = """
                    MERGE (m:MasterTopic {id: $master_id, chapter_id: $chapter_id})
                    WITH m
                    MATCH (n:Note {id: $note_id})
                    MERGE (n)-[rel:CONTRIBUTED_TO]->(m)
                    SET rel.weight = $weight
                    """
                    neo4j_db.execute_query(query, parameters={
                        "master_id": master_id,
                        "chapter_id": chapter_id,
                        "note_id": note_id,
                        "weight": weight
                    })
        except Exception as e:
            print(f"Error processing cluster {label}: {e}")
            
    print(f"✅ Successfully built {len(master_notes_inserted)} master notes for chapter {chapter_id}!")
    
    # Phase 17: Ghost Note Evaluation
    if master_notes_inserted:
        try:
            full_master_content = "\n".join([m["content"] for m in master_notes_inserted])
            
            # Fetch all user chunks for this chapter
            user_chunks_res = supabase.table("note_chunks").select("user_id, content").eq("chapter_id", chapter_id).execute()
            
            user_contents = {}
            if user_chunks_res.data:
                for c in user_chunks_res.data:
                    uid = c.get("user_id")
                    if uid:
                        if uid not in user_contents:
                            user_contents[uid] = []
                        user_contents[uid].append(c.get("content", ""))
            
            model = genai.GenerativeModel("gemini-3.1-flash-lite")
            
            for uid, contents in user_contents.items():
                user_text = "\n".join(contents)
                prompt = f"What vital concepts exist in the Master Note that are missing from this user's notes? Keep it brief and focused on specific concepts. If nothing vital is missing, reply EXACTLY with 'NONE'.\n\nMaster Note:\n{full_master_content}\n\nUser Notes:\n{user_text}"
                try:
                    response = model.generate_content(prompt)
                    missing_concepts = response.text.strip()
                    
                    if not missing_concepts or missing_concepts.upper() == "NONE":
                        continue
                    
                    # Save to ghost_notes table
                    ghost_res = supabase.table("ghost_notes").insert({
                        "user_id": uid,
                        "chapter_id": chapter_id,
                        "content": missing_concepts
                    }).execute()
                    
                    if ghost_res.data:
                        ghost_id = ghost_res.data[0]["id"]
                        
                        # Create GhostNode in Neo4j
                        query = """
                        MERGE (u:User {id: $user_id})
                        MERGE (g:GhostNote {id: $ghost_id, chapter_id: $chapter_id, title: "Missing Concept"})
                        WITH u, g
                        MATCH (m:MasterTopic {chapter_id: $chapter_id})
                        WITH u, g, m LIMIT 1
                        MERGE (u)-[:RECEIVED_GHOST]->(g)
                        MERGE (g)-[:DERIVED_FROM]->(m)
                        """
                        neo4j_db.execute_query(query, parameters={
                            "user_id": uid,
                            "ghost_id": ghost_id,
                            "chapter_id": chapter_id
                        })
                except Exception as e:
                    print(f"Ghost note gen error for user {uid}: {e}")
                    
        except Exception as e:
            print(f"Ghost note evaluation error: {e}")

    return master_notes_inserted

def build_god_note(course_id: str):
    # Fetch all chapters for this course
    chapters_res = supabase.table("chapters").select("id").eq("course_id", course_id).execute()
    if not chapters_res.data:
        return {"status": "error", "message": "No chapters found"}
    
    chapter_ids = [c["id"] for c in chapters_res.data]
    
    # Fetch all master notes for these chapters
    master_notes_res = supabase.table("master_notes").select("content, chapter_id").in_("chapter_id", chapter_ids).execute()
    master_notes = master_notes_res.data
    
    if not master_notes:
        return {"status": "error", "message": "No master notes found"}
        
    combined_content = "\n\n".join([f"Chapter {m['chapter_id']}:\n{m['content']}" for m in master_notes])
    
    model = genai.GenerativeModel("gemini-3.1-flash-lite")
    prompt = f"Synthesize all the following chapter master notes into a comprehensive 'God Note' study guide for the entire course. Format it beautifully in Markdown with sections, summaries, and key takeaways.\n\n{combined_content}"
    
    try:
        synthesis = model.generate_content(prompt)
        god_note_content = synthesis.text.strip()
        
        insert_data = {
            "course_id": course_id,
            "content": god_note_content
        }
        res = supabase.table("god_notes").insert(insert_data).execute()
        return {"status": "success", "god_note": res.data[0] if res.data else None}
    except Exception as e:
        print(f"God note build error: {e}")
        return {"status": "error", "message": str(e)}