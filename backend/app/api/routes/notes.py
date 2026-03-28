from fastapi import APIRouter, Depends, status
from app.api.dependencies import get_current_user
from app.models.schemas import NoteCreate, NoteResponse

router = APIRouter()


@router.get("/", response_model=list[NoteResponse])
async def get_notes(current_user: dict = Depends(get_current_user)):
    """Fetch all notes for the authenticated user. (Placeholder)"""
    # TODO: query Neo4j for this user's note nodes
    return []


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: NoteCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new note node in the knowledge graph. (Placeholder)"""
    # TODO: create note node in Neo4j and link to user
    return NoteResponse(id="placeholder-id", title=note.title, content=note.content)
