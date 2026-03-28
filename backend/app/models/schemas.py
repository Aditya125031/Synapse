from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSyncRequest(BaseModel):
    """The payload Next.js sends after a successful Supabase login"""
    email: EmailStr
    full_name: Optional[str] = "Anonymous Learner"
    avatar_url: Optional[str] = None

class UserSyncResponse(BaseModel):
    message: str
    user_id: str
    is_new_user: bool