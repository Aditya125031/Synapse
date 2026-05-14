from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import os
from supabase import create_client, Client
from app.api.dependencies import get_current_user
from app.core.master_builder import build_god_note
from app.db.neo4j_client import neo4j_db

router = APIRouter()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class CourseCreate(BaseModel):
    name: str
    semester: str
    class_id: str # <-- ADDED THIS

class ChapterCreate(BaseModel):
    course_id: str
    name: str

class CourseUpdate(BaseModel):
    name: str
    semester: str

class ChapterUpdate(BaseModel):
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
            
    # Create the Course WITH the class_id
    data = supabase.table("courses").insert({
        "name": req.name,
        "semester": req.semester,
        "class_id": req.class_id, # <-- ADDED THIS
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

@router.post("/{course_id}/god-note")
async def generate_god_note(course_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # Check if user is admin in the class this course belongs to
    course_res = supabase.table("courses").select("class_id").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    class_id = course_res.data[0]["class_id"]
    
    member_res = supabase.table("class_members").select("role").eq("class_id", class_id).eq("user_id", user_id).execute()
    if not member_res.data or member_res.data[0]["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can generate the God Note")
        
    result = build_god_note(course_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
        
    return result

@router.patch("/{course_id}")
async def update_course(course_id: str, req: CourseUpdate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    course_res = supabase.table("courses").select("class_id").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    class_id = course_res.data[0]["class_id"]
    admin_check = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    updated = supabase.table("courses").update({
        "name": req.name,
        "semester": req.semester
    }).eq("id", course_id).execute()
    
    return {"status": "success", "course": updated.data[0] if updated.data else None}

@router.delete("/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    course_res = supabase.table("courses").select("class_id").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    class_id = course_res.data[0]["class_id"]
    admin_check = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    # Cascade preparation: Fetch all chapters for this course
    chapters_res = supabase.table("chapters").select("id").eq("course_id", course_id).execute()
    chapter_ids = [c["id"] for c in chapters_res.data] if chapters_res.data else []
    
    # Execute Neo4j cleanup
    if chapter_ids:
        try:
            neo4j_db.execute_query(
                "MATCH (n) WHERE n.chapter_id IN $chapter_ids DETACH DELETE n",
                {"chapter_ids": chapter_ids}
            )
        except Exception as e:
            print(f"Neo4j cleanup failed: {e}")
            
    # Execute Supabase delete
    supabase.table("courses").delete().eq("id", course_id).execute()
    return {"status": "success", "message": "Course deleted successfully"}

@router.patch("/chapters/{chapter_id}")
async def update_chapter(chapter_id: str, req: ChapterUpdate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    chapter_res = supabase.table("chapters").select("course_id").eq("id", chapter_id).execute()
    if not chapter_res.data:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    course_id = chapter_res.data[0]["course_id"]
    course_res = supabase.table("courses").select("class_id").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    class_id = course_res.data[0]["class_id"]
    admin_check = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    updated = supabase.table("chapters").update({
        "name": req.name
    }).eq("id", chapter_id).execute()
    
    return {"status": "success", "chapter": updated.data[0] if updated.data else None}

@router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    chapter_res = supabase.table("chapters").select("course_id").eq("id", chapter_id).execute()
    if not chapter_res.data:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    course_id = chapter_res.data[0]["course_id"]
    course_res = supabase.table("courses").select("class_id").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    class_id = course_res.data[0]["class_id"]
    admin_check = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    # Execute Neo4j cleanup
    try:
        neo4j_db.execute_query(
            "MATCH (n {chapter_id: $chapter_id}) DETACH DELETE n",
            {"chapter_id": chapter_id}
        )
    except Exception as e:
        print(f"Neo4j cleanup failed: {e}")
        
    # Execute Supabase delete
    supabase.table("chapters").delete().eq("id", chapter_id).execute()
    return {"status": "success", "message": "Chapter deleted successfully"}