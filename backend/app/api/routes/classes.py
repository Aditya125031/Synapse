import os
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from app.api.dependencies import get_current_user

router = APIRouter()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class ClassCreate(BaseModel):
    name: str
    description: str = ""

class ClassJoin(BaseModel):
    join_code: str

def generate_join_code():
    return "SYN-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create")
async def create_class(req: ClassCreate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    join_code = generate_join_code()
    
    # Create the class
    new_class = supabase.table("classes").insert({
        "name": req.name,
        "description": req.description,
        "join_code": join_code,
        "created_by": user_id
    }).execute()
    
    class_id = new_class.data[0]["id"]
    
    # Add creator as an admin member
    supabase.table("class_members").insert({
        "class_id": class_id,
        "user_id": user_id,
        "role": "admin"
    }).execute()
    
    return {"status": "success", "class": new_class.data[0]}

@router.post("/join")
async def join_class(req: ClassJoin, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # Find the class by code
    target_class = supabase.table("classes").select("id").eq("join_code", req.join_code).execute()
    if not target_class.data:
        raise HTTPException(status_code=404, detail="Invalid join code.")
        
    class_id = target_class.data[0]["id"]
    
    # Check if already joined
    existing = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="You are already in this class.")
        
    # Join the class
    supabase.table("class_members").insert({
        "class_id": class_id,
        "user_id": user_id,
        "role": "student"
    }).execute()
    
    return {"status": "success", "message": "Successfully joined the class!"}
