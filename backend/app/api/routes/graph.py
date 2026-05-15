from fastapi import APIRouter, HTTPException
import os
from supabase import create_client, Client
from app.db.neo4j_client import neo4j_db

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

@router.get("/graph/{chapter_id}")
async def get_graph(chapter_id: str):
    nodes = {}
    links = []
    
    # We now return the relationship property DIRECTLY in the Cypher query
    query1 = """
    MATCH (n:Note {chapter_id: $chapter_id})
    OPTIONAL MATCH (u:User)-[w:UPLOADED]->(n)
    OPTIONAL MATCH (n)-[ct:CONTRIBUTED_TO]->(m:MasterTopic)
    RETURN u, w, n, coalesce(ct.strength, 0.8) AS master_weight, m
    """
    
    query2 = """
    MATCH (g:GhostNote {chapter_id: $chapter_id})
    OPTIONAL MATCH (ug:User)-[rg:RECEIVED_GHOST]->(g)
    OPTIONAL MATCH (g)-[df:DERIVED_FROM]->(m:MasterTopic)
    RETURN ug, rg, g, coalesce(df.strength, 0.8) AS master_weight, m
    """
    
    try:
        results1 = neo4j_db.execute_query(query1, parameters={"chapter_id": chapter_id})
        for record in results1:
            n = record.get("n")
            u = record.get("u")
            m = record.get("m")
            master_weight = record.get("master_weight")
            
            if n:
                nodes[n["id"]] = {"id": n["id"], "type": "note", "title": n.get("title", "Note")}
                if u:
                    nodes[u["id"]] = {"id": u["id"], "type": "user"}
                    links.append({"source": u["id"], "target": n["id"], "weight": 1.0})
                if m:
                    nodes[m["id"]] = {"id": m["id"], "type": "master"}
                    links.append({"source": n["id"], "target": m["id"], "weight": master_weight})

        results2 = neo4j_db.execute_query(query2, parameters={"chapter_id": chapter_id})
        for record in results2:
            g = record.get("g")
            ug = record.get("ug")
            m = record.get("m")
            master_weight = record.get("master_weight")
            
            if g:
                nodes[g["id"]] = {"id": g["id"], "type": "ghost", "content": g.get("content", "")}
                if ug:
                    nodes[ug["id"]] = {"id": ug["id"], "type": "user"}
                    links.append({"source": ug["id"], "target": g["id"], "weight": 1.0})
                if m:
                    nodes[m["id"]] = {"id": m["id"], "type": "master"}
                    links.append({"source": g["id"], "target": m["id"], "weight": master_weight})

        user_ids = [nid for nid, ndata in nodes.items() if ndata["type"] == "user"]
        if user_ids:
            profile_res = supabase.table("profiles").select("id, full_name, avatar_url").in_("id", user_ids).execute()
            p_map = {p["id"]: p for p in profile_res.data}
            for uid in user_ids:
                if uid in p_map:
                    nodes[uid]["full_name"] = p_map[uid].get("full_name", "Student")
                    nodes[uid]["avatar_url"] = p_map[uid].get("avatar_url", "")

        return {"nodes": list(nodes.values()), "links": links}
    except Exception as e:
        print(f"Graph Error: {e}")
        return {"nodes": [], "links": []}