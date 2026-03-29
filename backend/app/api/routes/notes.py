import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import io
from pypdf import PdfReader
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai
from app.api.dependencies import get_current_user
from datetime import datetime, timezone

# --- NEW: Import Neo4j and the local embedding model ---
from app.db.neo4j_client import neo4j_db, embedding_model

load_dotenv()

router = APIRouter()

# Initialize API clients safely
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    raise ValueError("Missing credentials in .env file!")

# Configure Google Gemini (For Supabase)
genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SyncRequest(BaseModel):
    chapter_id: str
    content: str

@router.post("/sync")
async def sync_to_hive(
    req: SyncRequest, 
    current_user: dict = Depends(get_current_user)
):
    try:
        # --- 5-DAY RATE LIMIT CHECK ---
        recent_note = supabase.table("note_chunks").select("created_at").eq("user_id", current_user["user_id"]).eq("chapter_id", req.chapter_id).order("created_at", desc=True).limit(1).execute()
        
        if len(recent_note.data) > 0:
            last_uploaded = datetime.fromisoformat(recent_note.data[0]["created_at"])
            days_since = (datetime.now(timezone.utc) - last_uploaded).days
            if days_since < 7:
                raise HTTPException(status_code=429, detail=f"Rate Limit: You can only upload notes for this chapter once every 7 days. Try again in {7 - days_since} days.")
        # ------------------------------

        # ==========================================
        # 1. SUPABASE LOGIC (CollabQuest Hive & Reputation)
        # ==========================================
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=req.content,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        vector_data = result['embedding']

        supabase.table("note_chunks").insert({
            "user_id": current_user["user_id"],
            "chapter_id": req.chapter_id,
            "content": req.content,
            "embedding": vector_data
        }).execute()

        supabase.rpc("increment_reputation", {"user_id": current_user["user_id"], "amount": 10}).execute()


        # ==========================================
        # 2. NEO4J LOGIC (Synapse AI Knowledge Graph)
        # ==========================================
        # Generate the local 384-dimensional vector for Neo4j
        neo4j_vector = embedding_model.encode(req.content).tolist()
        
        neo4j_query = """
        CREATE (n:Note {
            id: randomUUID(),
            user_id: $user_id,
            title: $title,
            content: $content,
            embedding: $embedding,
            created_at: timestamp()
        })
        RETURN n.id AS id
        """
        
        neo4j_db.execute_query(neo4j_query, {
            "user_id": current_user["user_id"],
            "title": f"Note for Chapter {req.chapter_id}", # Auto-generating a title
            "content": req.content,
            "embedding": neo4j_vector
        })

        return {"status": "success", "message": "Node synced to collective hive AND saved to Synapse Graph!"}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    chapter_id: str = Form("dummy-chapter-id"),
    current_user: dict = Depends(get_current_user)
):
    try:
        # --- 5-DAY RATE LIMIT CHECK ---
        recent_note = supabase.table("note_chunks").select("created_at").eq("user_id", current_user["user_id"]).eq("chapter_id", chapter_id).order("created_at", desc=True).limit(1).execute()
        
        if len(recent_note.data) > 0:
            last_uploaded = datetime.fromisoformat(recent_note.data[0]["created_at"])
            days_since = (datetime.now(timezone.utc) - last_uploaded).days
            if days_since < 5:
                raise HTTPException(status_code=429, detail=f"Rate Limit: You can only upload notes for this chapter once every 5 days. Try again in {5 - days_since} days.")
        # ------------------------------

        contents = await file.read()
        pdf = PdfReader(io.BytesIO(contents))
        
        full_text = ""
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                sanitized_text = extracted.replace('\x00', '').replace('\u0000', '')
                full_text += sanitized_text + "\n"
                
        raw_chunks = full_text.split("\n\n")
        chunks = [chunk.strip() for chunk in raw_chunks if len(chunk.strip()) > 50]
        
        if not chunks:
            return {"status": "error", "message": "No readable text found in PDF."}

        # ==========================================
        # 1. SUPABASE PDF LOGIC
        # ==========================================
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=chunks,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        
        insert_data = []
        for i, embedding in enumerate(result['embedding']):
            insert_data.append({
                "user_id": current_user["user_id"],
                "chapter_id": chapter_id,
                "content": chunks[i],
                "embedding": embedding
            })
            
        supabase.table("note_chunks").insert(insert_data).execute()

        # ==========================================
        # 2. NEO4J PDF LOGIC
        # ==========================================
        # Process the entire PDF as one giant context node for the Graph Chatbot
        combined_pdf_text = " ".join(chunks)
        neo4j_vector = embedding_model.encode(combined_pdf_text).tolist()
        
        neo4j_query = """
        CREATE (n:Note {
            id: randomUUID(),
            user_id: $user_id,
            title: $title,
            content: $content,
            embedding: $embedding,
            created_at: timestamp()
        })
        """
        neo4j_db.execute_query(neo4j_query, {
            "user_id": current_user["user_id"],
            "title": f"PDF Document: {file.filename}",
            "content": combined_pdf_text,
            "embedding": neo4j_vector
        })

        return {
            "status": "success", 
            "message": f"Successfully vectorized {len(chunks)} chunks to Supabase & saved to Neo4j.",
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"PDF Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))