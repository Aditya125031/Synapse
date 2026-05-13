from app.db.neo4j_client import neo4j_db
from supabase import Client

def save_pdf_chunks(supabase: Client, chunks: list, embeddings: list, note_id: str, user_id: str, chapter_id: str, title: str = "Uploaded Note", course: str = "Unknown"):
    # 1. Save chunks to Supabase
    insert_data = [{
        "note_id": note_id,
        "user_id": user_id,
        "chapter_id": chapter_id,
        "content": chunks[i],
        "embedding": embedding
    } for i, embedding in enumerate(embeddings)]
        
    res = supabase.table("note_chunks").insert(insert_data).execute()
    
    # 2. CREATE THE PARENT NOTE NODE IN NEO4J (PHASE 9 FIX)
    query = """
    MERGE (u:User {id: $user_id})
    MERGE (n:Note {id: $note_id, chapter_id: $chapter_id, title: $title})
    MERGE (u)-[:UPLOADED]->(n)
    """
    neo4j_db.execute_query(query, parameters={
        "user_id": user_id,
        "note_id": note_id,
        "chapter_id": chapter_id,
        "title": title
    })
    
    return res