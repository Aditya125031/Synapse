from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.stitcher import generate_stitcher_output

router = APIRouter()

class StitchRequest(BaseModel):
    text: str

@router.post("/stitch")
async def stitch_notes(request: StitchRequest):
    try:
        result = generate_stitcher_output(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))