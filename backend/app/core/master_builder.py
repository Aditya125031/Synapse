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

def build_master_notes(chapter_id: str):
    # Phase 12: Idempotent - delete existing master notes for this chapter
    try:
        supabase.table("master_notes").delete().eq("chapter_id", chapter_id).execute()
        neo4j_db.execute_query("MATCH (m:MasterTopic {chapter_id: $chapter_id}) DETACH DELETE m", parameters={"chapter_id": chapter_id})
    except Exception as e:
        print(f"Failed to clean up old master notes: {e}")

    # Fetch all content and embedding for the given chapter from the Supabase note_chunks table.
    response = supabase.table("note_chunks").select("id, content, embedding").eq("chapter_id", chapter_id).execute()
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
                
                # FIXED: Update Neo4j to link using chapter_id
                query = """
                MERGE (m:MasterTopic {id: $master_id, chapter_id: $chapter_id})
                WITH m
                MATCH (n:Note {chapter_id: $chapter_id})
                MERGE (n)-[:CONTRIBUTED_TO]->(m)
                """
                neo4j_db.execute_query(query, parameters={
                    "master_id": master_id,
                    "chapter_id": chapter_id
                })
        except Exception as e:
            print(f"Error processing cluster {label}: {e}")
            
    print(f"✅ Successfully built {len(master_notes_inserted)} master notes for chapter {chapter_id}!")
    return master_notes_inserted