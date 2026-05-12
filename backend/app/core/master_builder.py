import os
import json
import numpy as np
from sklearn.cluster import KMeans
from supabase import create_client, Client
import google.generativeai as genai
from app.db.neo4j_client import neo4j_db
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def build_master_notes(course: str):
    # Fetch all content and embedding for the given course from the Supabase note_chunks table.
    response = supabase.table("note_chunks").select("id, content, embedding").eq("chapter_id", course).execute()
    chunks = response.data
    
    if not chunks:
        # Fallback to check if the column is actually 'course'
        response = supabase.table("note_chunks").select("id, content, embedding").eq("course", course).execute()
        chunks = response.data
        if not chunks:
            print(f"No chunks found for course {course}.")
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
        
    # Use a lightweight clustering algorithm (e.g., KMeans) to group the 768-dimensional embeddings
    # into thematic clusters.
    n_samples = X.shape[0]
    n_clusters = max(1, min(n_samples // 5, 10)) # Target ~5 chunks per cluster, max 10 clusters
    
    # Ensure n_clusters does not exceed n_samples
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
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    for label, cluster_chunks in clusters.items():
        # For each cluster, pass the combined text to Gemini 1.5 Flash with the prompt:
        # "Synthesize these student notes into a single accurate Master Note paragraph. Discard inaccuracies."
        combined_text = "\n\n".join([c["content"] for c in cluster_chunks])
        prompt = f"Synthesize these student notes into a single accurate Master Note paragraph. Discard inaccuracies.\n\nNotes:\n{combined_text}"
        
        try:
            synthesis = model.generate_content(prompt)
            master_content = synthesis.text.strip()
            
            # Save the resulting Master Note paragraphs to a new Supabase table called master_notes 
            # (columns: id, course, content).
            insert_data = {
                "course": course,
                "content": master_content
            }
            res = supabase.table("master_notes").insert(insert_data).execute()
            
            if res.data:
                master_id = res.data[0]["id"]
                master_notes_inserted.append(res.data[0])
                
                # Update Neo4j to link the original NoteChunks to this new MasterTopic
                for c in cluster_chunks:
                    chunk_id = c["id"]
                    
                    query = """
                    MERGE (m:MasterTopic {id: $master_id, course: $course})
                    WITH m
                    MATCH (c:NoteChunk {id: $chunk_id})
                    MERGE (c)-[:CONTRIBUTED_TO]->(m)
                    """
                    neo4j_db.execute_query(query, parameters={
                        "master_id": master_id,
                        "course": course,
                        "chunk_id": chunk_id
                    })
        except Exception as e:
            print(f"Error processing cluster {label}: {e}")
            
    return master_notes_inserted
