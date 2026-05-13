from app.db.neo4j_client import neo4j_db
from supabase import Client

def save_pdf_chunks(supabase: Client, chunks: list, embeddings: list, note_id: str, user_id: str, chapter_id: str, course: str = "Unknown"):
    # 1. Save to Supabase
    insert_data = [{
        "note_id": note_id,
        "user_id": user_id,
        "chapter_id": chapter_id,
        "content": chunks[i],
        "embedding": embedding
    } for i, embedding in enumerate(embeddings)]
        
    res = supabase.table("note_chunks").insert(insert_data).execute()
    
    # 2. Iterate through the chunks and execute a Cypher query to link the User to the NoteChunk
    for chunk in res.data:
        chunk_id = chunk["id"]
        # FIXED: Added chapter_id to the Neo4j NoteChunk node!
        query = """
        MERGE (u:User {id: $user_id})
        MERGE (c:NoteChunk {id: $chunk_id, chapter_id: $chapter_id, course: $course})
        MERGE (u)-[:WROTE]->(c)
        """
        neo4j_db.execute_query(query, parameters={
            "user_id": user_id,
            "chunk_id": chunk_id,
            "chapter_id": chapter_id, # <-- Added parameter
            "course": course
        })
    
    return res