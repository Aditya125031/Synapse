def save_pdf_chunks(chunks: list, embeddings: list, user_id: str, course: str):
    """
    Takes list of text chunks and their corresponding 768-dim embeddings
    and saves them to the Supabase note_chunks table.
    """
    data = []
    for text, vector in zip(chunks, embeddings):
        data.append({
            "user_id": user_id,
            "course": course,
            "content": text,
            "embedding": vector
        })
    
    # Bulk insert for speed
    return supabase.table("note_chunks").insert(data).execute()