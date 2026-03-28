import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

# Force load environment variables right here just to be safe
load_dotenv()

security = HTTPBearer()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Safety check for the credentials
if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL ERROR: Supabase URL or Key is missing in dependencies.py!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    
    print("\n========== AUTH DEBUG START ==========")
    print(f"1. Token Received. Length: {len(token)}")
    print(f"2. Token snippet: {token[:15]}...")
    
    # Check if the frontend accidentally sent a literal string of "null"
    if token == "null" or token == "undefined" or len(token) < 20:
        print("3. ERROR: The token is invalid, null, or too short!")
        print("========== AUTH DEBUG END ==========\n")
        raise HTTPException(status_code=401, detail="Invalid token format sent from frontend.")

    try:
        # Ask Supabase to verify the token and return the user
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            print("3. ERROR: Supabase verified the token but returned no user.")
            print("========== AUTH DEBUG END ==========\n")
            raise HTTPException(status_code=401, detail="No user found for this token.")
            
        print(f"3. SUCCESS! User validated. ID: {user_response.user.id}")
        print("========== AUTH DEBUG END ==========\n")
        
        return {"user_id": user_response.user.id}
        
    except Exception as e:
        # THIS IS THE GOLDMINE. This will print the exact Supabase rejection reason.
        print(f"3. SUPABASE VERIFICATION FAILED: {str(e)}")
        print("========== AUTH DEBUG END ==========\n")
        
        # We also send the error back to the frontend so you can see it in the browser network tab
        raise HTTPException(status_code=401, detail=f"Backend Auth Error: {str(e)}")