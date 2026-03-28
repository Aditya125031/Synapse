import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import io
from pypdf import PdfReader
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai
from app.api.dependencies import get_current_user

load_dotenv()

router = APIRouter()

# Initialize API clients safely
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_JWT_SECRET")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    raise ValueError("Missing credentials in .env file!")

# Configure Google Gemini
genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SyncRequest(BaseModel):
    course_id: str
    content: str

@router.post("/sync")
async def sync_to_hive(
    req: SyncRequest, 
    current_user: dict = Depends(get_current_user)
):
    try:
        # 1. Turn the text into a Gemini Vector
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=req.content,
            task_type="retrieval_document",
        )
        vector_data = result['embedding']

        # 2. Save to Supabase
        supabase.table("note_chunks").insert({
            "user_id": current_user["user_id"],
            "course": req.course_id,
            "content": req.content,
            "embedding": vector_data
        }).execute()

        return {"status": "success", "message": "Node synced to collective hive"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    course_id: str = Form("dbms"),
    current_user: dict = Depends(get_current_user)
):
    try:
        contents = await file.read()
        pdf = PdfReader(io.BytesIO(contents))
        
        full_text = ""
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                full_text += extracted + "\n"
                
        raw_chunks = full_text.split("\n\n")
        chunks = [chunk.strip() for chunk in raw_chunks if len(chunk.strip()) > 50]
        
        if not chunks:
            return {"status": "error", "message": "No readable text found in PDF."}

        # Batch embed all chunks at once with Gemini
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=chunks,
            task_type="retrieval_document",
        )
        
        insert_data = []
        # result['embedding'] returns a list of vectors matching our chunks list
        for i, embedding in enumerate(result['embedding']):
            insert_data.append({
                "user_id": current_user["user_id"],
                "course": course_id,
                "content": chunks[i],
                "embedding": embedding
            })
            
        supabase.table("note_chunks").insert(insert_data).execute()

        return {
            "status": "success", 
            "message": f"Successfully vectorized {len(chunks)} chunks using Gemini.",
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        print(f"PDF Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))