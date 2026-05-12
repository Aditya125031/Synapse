import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
import io
from pypdf import PdfReader
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai
from app.api.dependencies import get_current_user
from datetime import datetime, timezone
from app.db.vector_service import save_pdf_chunks
from typing import Annotated

load_dotenv()
router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SyncRequest(BaseModel):
    chapter_id: str
    title: str  # <-- New Topic Name field
    content: str

@router.post("/sync")
async def sync_to_hive(req: SyncRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Rate Limit Check (7 Days)
        recent_note = supabase.table("notes").select("created_at").eq("user_id", current_user["user_id"]).eq("chapter_id", req.chapter_id).order("created_at", desc=True).limit(1).execute()
        if len(recent_note.data) > 0:
            last_uploaded = datetime.fromisoformat(recent_note.data[0]["created_at"])
            days_since = (datetime.now(timezone.utc) - last_uploaded).days
            if days_since < 7:
                raise HTTPException(status_code=429, detail=f"Rate Limit: Try again in {7 - days_since} days.")

        # 1. Create the Parent Note
        note_res = supabase.table("notes").insert({
            "chapter_id": req.chapter_id,
            "user_id": current_user["user_id"],
            "title": req.title
        }).execute()
        note_id = note_res.data[0]["id"]

        # 2. Vectorize the text
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=req.content,
            task_type="retrieval_document",
            output_dimensionality=768
        )

        # 3. Save the chunk linked to the parent note
        supabase.table("note_chunks").insert({
            "note_id": note_id,
            "user_id": current_user["user_id"],
            "chapter_id": req.chapter_id,
            "content": req.content,
            "embedding": result['embedding']
        }).execute()

        supabase.rpc("increment_reputation", {"user_id": current_user["user_id"], "amount": 10}).execute()
        return {"status": "success", "message": "Text note synced to collective hive"}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-pdf")
async def process_pdf(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    # --- ADD THESE 3 LINES ---
    print("\n--- INCOMING REQUEST DEBUG ---")
    print("HEADERS:", request.headers.get("content-type"))
    form_data = await request.form()
    print("FORM KEYS RECEIVED:", form_data.keys())
    print("----------------------------\n")
    try:
        # 1. Manually parse the multipart form data
        form_data = await request.form()
        
        chapter_id = form_data.get("chapter_id")
        title = form_data.get("title")
        file = form_data.get("file")

        # 2. Manual Validation (replaces the 422 error with a clear 400 error)
        if not chapter_id or not title:
            raise HTTPException(status_code=400, detail=f"Missing text fields. chapter_id: {chapter_id}, title: {title}")
        if not file or not hasattr(file, "read"):
            raise HTTPException(status_code=400, detail="Missing or invalid PDF file.")

        # --- The rest of your exact same logic starts here ---
        
        # Rate Limit Check (5 Days)
        recent_note = supabase.table("notes").select("created_at").eq("user_id", current_user["user_id"]).eq("chapter_id", chapter_id).order("created_at", desc=True).limit(1).execute()
        if len(recent_note.data) > 0:
            last_uploaded = datetime.fromisoformat(recent_note.data[0]["created_at"])
            days_since = (datetime.now(timezone.utc) - last_uploaded).days
            if days_since < 5:
                raise HTTPException(status_code=429, detail=f"Rate Limit: Try again in {5 - days_since} days.")

        # Create the Parent Note
        note_res = supabase.table("notes").insert({
            "chapter_id": chapter_id,
            "user_id": current_user["user_id"],
            "title": title
        }).execute()
        note_id = note_res.data[0]["id"]

        # Extract and sanitize PDF text
        contents = await file.read()
        pdf = PdfReader(io.BytesIO(contents))
        full_text = "".join([page.extract_text().replace('\x00', '') + "\n" for page in pdf.pages if page.extract_text()])
                
        raw_chunks = full_text.split("\n\n")
        chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 50]
        if not chunks:
            return {"status": "error", "message": "No readable text found in PDF."}

        # Batch embed
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=chunks,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        
        # Save all chunks
        save_pdf_chunks(
            supabase=supabase,
            chunks=chunks,
            embeddings=result['embedding'],
            note_id=note_id,
            user_id=current_user["user_id"],
            chapter_id=chapter_id
        )
            
        return {"status": "success", "message": f"Successfully vectorized {len(chunks)} chunks."}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))