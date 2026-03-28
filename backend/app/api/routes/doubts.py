import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
import google.generativeai as genai
from app.api.dependencies import get_current_user

load_dotenv()

router = APIRouter()

# Initialize API clients safely
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    raise ValueError("Missing credentials in .env file!")

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class DoubtRequest(BaseModel):
    chapter_id: str
    doubt_text: str
    chapter_topic: str  # e.g., "Database Normalization"

@router.post("/ask-doubt")
async def ask_doubt(req: DoubtRequest, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # 1. Fetch user profile to check ban status
    profile_res = supabase.table("profiles").select("doubt_strikes", "doubt_ban_until").eq("id", user_id).execute()
    profile = profile_res.data[0]
    
    # 2. Check Ban Timer
    if profile.get("doubt_ban_until"):
        ban_end = datetime.fromisoformat(profile["doubt_ban_until"])
        if datetime.now(timezone.utc) < ban_end:
            raise HTTPException(status_code=403, detail="You are banned from asking doubts for 48 hours due to irrelevant questions.")
    
    # 3. AI Validation using Gemini
    model = genai.GenerativeModel('gemini-3.0-flash')
    prompt = f"""
    You are an AI teaching assistant. Determine if the following student doubt is highly relevant to the topic of '{req.chapter_topic}'.
    Student Doubt: "{req.doubt_text}"
    Respond strictly with exactly one word: "VALID" if it makes sense academically, or "INVALID" if it is gibberish, spam, or off-topic.
    """
    ai_response = model.generate_content(prompt).text.strip().upper()
    
    if "INVALID" in ai_response:
        new_strikes = profile.get("doubt_strikes", 0) + 1
        
        if new_strikes >= 2:
            # 48 hour ban
            ban_time = datetime.now(timezone.utc) + timedelta(days=2)
            supabase.table("profiles").update({
                "doubt_strikes": 0,
                "doubt_ban_until": ban_time.isoformat()
            }).eq("id", user_id).execute()
            raise HTTPException(status_code=400, detail="Strike 2! Your doubt was irrelevant. You are banned from asking doubts for 48 hours.")
        else:
            # Issue Strike 1
            supabase.table("profiles").update({"doubt_strikes": new_strikes}).eq("id", user_id).execute()
            raise HTTPException(status_code=400, detail="Warning: Irrelevant doubt detected. Strike 1. One more and you are banned for 48 hours.")
            
    # 4. Success! If VALID, reset strikes, embed the doubt, and save it to the graph
    supabase.table("profiles").update({"doubt_strikes": 0}).eq("id", user_id).execute()
    
    # Process vector embedding (similar to what you did in notes.py)
    embed_result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=req.doubt_text,
        task_type="retrieval_document",
        output_dimensionality=768
    )
    
    # Insert doubt into your database table
    supabase.table("doubts").insert({
        "chapter_id": req.chapter_id,
        "user_id": user_id,
        "content": req.doubt_text,
        "embedding": embed_result['embedding']
    }).execute()
    
    return {"status": "success", "message": "Doubt added to the collective graph!"}
