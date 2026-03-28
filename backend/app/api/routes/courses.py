from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import os
from supabase import create_client, Client
from app.api.dependencies import get_current_user

router = APIRouter()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class CourseCreate(BaseModel):
    name: str
    semester: str

class ChapterCreate(BaseModel):
    course_id: str
    name: str

@router.post("/create-course")
async def create_course(req: CourseCreate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # RULE: 1 Course per Month
    recent = supabase.table("courses").select("created_at").eq("created_by", user_id).order("created_at", desc=True).limit(1).execute()
    
    if len(recent.data) > 0:
        last_created = datetime.fromisoformat(recent.data[0]["created_at"])
        days_since = (datetime.now(timezone.utc) - last_created).days
        if days_since < 30:
            raise HTTPException(status_code=429, detail=f"Rate Limit: You must wait {30 - days_since} more days to create another course.")
            
    # Create the Course
    data = supabase.table("courses").insert({
        "name": req.name,
        "semester": req.semester,
        "created_by": user_id
    }).execute()
    
    return {"status": "success", "course": data.data[0]}

@router.post("/create-chapter")
async def create_chapter(req: ChapterCreate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # RULE: 1 Chapter per 14 Days
    recent = supabase.table("chapters").select("created_at").eq("created_by", user_id).order("created_at", desc=True).limit(1).execute()
    
    if len(recent.data) > 0:
        last_created = datetime.fromisoformat(recent.data[0]["created_at"])
        days_since = (datetime.now(timezone.utc) - last_created).days
        if days_since < 14:
            raise HTTPException(status_code=429, detail=f"Rate Limit: You must wait {14 - days_since} more days to create another chapter.")
            
    # Create the Chapter
    data = supabase.table("chapters").insert({
        "course_id": req.course_id,
        "name": req.name,
        "created_by": user_id
    }).execute()
    
    return {"status": "success", "chapter": data.data[0]}