from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.models.schemas import UserSyncRequest, UserSyncResponse
from app.db.neo4j_client import neo4j_db

router = APIRouter()

@router.post("/sync", response_model=UserSyncResponse)
def sync_user_to_graph(
    payload: UserSyncRequest, 
    current_user: dict = Depends(get_current_user) # This validates the Supabase token!
):
    """
    Syncs the authenticated Supabase user into the Neo4j Knowledge Graph.
    Called by the Next.js frontend immediately after login/signup.
    """
    user_id = current_user["user_id"]
    
    # Cypher query to MERGE the user node. 
    # MERGE acts like an UPSERT (Update or Insert)
    cypher_query = """
    MERGE (u:Student {id: $user_id})
    ON CREATE SET 
        u.email = $email,
        u.name = $full_name,
        u.avatar = $avatar_url,
        u.reputation_points = 0,
        u.created_at = timestamp()
    ON MATCH SET
        u.last_login = timestamp()
    RETURN u
    """
    
    parameters = {
        "user_id": user_id,
        "email": payload.email,
        "full_name": payload.full_name,
        "avatar_url": payload.avatar_url
    }
    
    # Execute the query on our graph database
    result = neo4j_db.execute_query(cypher_query, parameters)
    
    # Check if this was their first time logging in based on our default values
    is_new = result[0]['u'].get('reputation_points') == 0 if result else False

    return UserSyncResponse(
        message="User synced to Knowledge Graph successfully.",
        user_id=user_id,
        is_new_user=is_new
    )