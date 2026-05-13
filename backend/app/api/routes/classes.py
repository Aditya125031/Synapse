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

class RequestAction(BaseModel):
    class_id: str
    user_id: str

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
    
    # Add creator as an admin member (Auto-approved)
    supabase.table("class_members").insert({
        "class_id": class_id,
        "user_id": user_id,
        "role": "admin",
        "status": "approved"
    }).execute()
    
    return {"status": "success", "class": new_class.data[0]}

@router.post("/join")
async def join_class(req: ClassJoin, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    target_class = supabase.table("classes").select("id").eq("join_code", req.join_code).execute()
    if not target_class.data:
        raise HTTPException(status_code=404, detail="Invalid join code.")
        
    class_id = target_class.data[0]["id"]
    
    existing = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user_id).execute()
    if existing.data:
        if existing.data[0].get("status") == "pending":
            raise HTTPException(status_code=400, detail="Your request is already pending approval.")
        raise HTTPException(status_code=400, detail="You are already in this class.")
        
    # Join the class as PENDING
    supabase.table("class_members").insert({
        "class_id": class_id,
        "user_id": user_id,
        "role": "student",
        "status": "pending"
    }).execute()
    
    return {"status": "success", "message": "Join request sent to the admin!"}

@router.get("/requests/{class_id}")
async def get_requests(class_id: str, user: dict = Depends(get_current_user)):
    # Verify user is admin of class
    admin_check = supabase.table("class_members").select("*").eq("class_id", class_id).eq("user_id", user["user_id"]).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    requests = supabase.table("class_members").select("user_id").eq("class_id", class_id).eq("status", "pending").execute()
    return {"status": "success", "requests": requests.data}

@router.post("/approve")
async def approve_request(req: RequestAction, user: dict = Depends(get_current_user)):
    admin_check = supabase.table("class_members").select("*").eq("class_id", req.class_id).eq("user_id", user["user_id"]).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    supabase.table("class_members").update({"status": "approved"}).eq("class_id", req.class_id).eq("user_id", req.user_id).execute()
    return {"status": "success", "message": "Request approved."}

@router.post("/reject")
async def reject_request(req: RequestAction, user: dict = Depends(get_current_user)):
    admin_check = supabase.table("class_members").select("*").eq("class_id", req.class_id).eq("user_id", user["user_id"]).eq("role", "admin").execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    supabase.table("class_members").delete().eq("class_id", req.class_id).eq("user_id", req.user_id).execute()
    return {"status": "success", "message": "Request rejected."}