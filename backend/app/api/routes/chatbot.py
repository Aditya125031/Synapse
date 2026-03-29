# backend/app/api/routes/chatbot.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.services.chatbot_services import generate_chat_reply # Ensure this path matches where you saved the LangGraph code!

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(data: ChatRequest):
    try:
        # Hardcoding a dummy user_id for testing until you hook up your actual Auth
        user_id = "test_user_123" 
        
        answer = await generate_chat_reply(
            question=data.question, 
            user_id=user_id
        )
        return {"answer": answer}

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Synapse AI is momentarily disconnected.")