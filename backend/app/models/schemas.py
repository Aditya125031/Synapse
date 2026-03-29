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

# ==========================================
# 2. SCHEMAS (Synapse Knowledge Graph)
# ==========================================
class NoteBase(BaseModel):
    title: str
    content: str

class NoteCreate(NoteBase):
    user_id: str
    chapter_id: Optional[str] = None # For CollabQuest Hive sync

class NoteResponse(NoteBase):
    id: str
    user_id: str
    created_at: str


# ==========================================
# 3. COURSE SCHEMAS (For Future Use)
# ==========================================
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    user_id: str

class CourseResponse(CourseBase):
    id: str
    created_at: str