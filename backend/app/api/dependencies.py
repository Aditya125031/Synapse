from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

security = HTTPBearer()

# Supabase JWT Secret (Found in your Supabase Dashboard settings)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") 

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    This function intercepts API requests, checks the token, 
    and returns the user's Supabase ID if valid.
    """
    token = credentials.credentials
    try:
        # Supabase uses HS256 algorithm by default
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"], 
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub") # 'sub' is the user ID in Supabase
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        # You can extract email here too if needed: payload.get("email")
        return {"user_id": user_id, "email": payload.get("email")}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )