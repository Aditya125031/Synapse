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
    # Initialize variables at the top level to avoid UnboundLocalError
    nodes = {}
    links = []
    user_ids = [] # <--- Critical Fix
    
    query1 = """
    MATCH (n:Note {chapter_id: $chapter_id})
    OPTIONAL MATCH (u:User)-[w:UPLOADED]->(n)
    OPTIONAL MATCH (n)-[ct:CONTRIBUTED_TO]->(m:MasterTopic)
    RETURN u, w, n, ct, m
    """
    
    query2 = """
    MATCH (g:GhostNote {chapter_id: $chapter_id})
    OPTIONAL MATCH (ug:User)-[rg:RECEIVED_GHOST]->(g)
    OPTIONAL MATCH (g)-[df:DERIVED_FROM]->(m:MasterTopic)
    RETURN ug, rg, g, df, m
    """
    
    try:
        results1 = neo4j_db.execute_query(query1, parameters={"chapter_id": chapter_id})
        for record in results1:
            n = record.get("n")
            u = record.get("u")
            m = record.get("m")
            ct = record.get("ct")
            if n:
                node_data = {"id": n["id"], "type": "note", "title": n.get("title", "Note")}
                if u:
                    node_data["user_id"] = u["id"]
                nodes[n["id"]] = node_data
                if u:
                    nodes[u["id"]] = {"id": u["id"], "type": "user"}
                    links.append({"source": u["id"], "target": n["id"], "weight": 1.0})
                if m:
                    nodes[m["id"]] = {"id": m["id"], "type": "master"}
                    edge_weight = ct.get("weight", 0.5) if ct else 0.5
                    links.append({"source": n["id"], "target": m["id"], "weight": edge_weight})

        results2 = neo4j_db.execute_query(query2, parameters={"chapter_id": chapter_id})
        for record in results2:
            g = record.get("g")
            ug = record.get("ug")
            m = record.get("m")
            if g:
                nodes[g["id"]] = {"id": g["id"], "type": "ghost", "content": g.get("content", "")}
                if ug:
                    nodes[ug["id"]] = {"id": ug["id"], "type": "user"}
                    links.append({"source": ug["id"], "target": g["id"], "weight": 1.0})
                if m:
                    nodes[m["id"]] = {"id": m["id"], "type": "master"}
                    links.append({"source": g["id"], "target": m["id"], "weight": 0.8})

        # Fetch Profile Data
        user_ids = [nid for nid, ndata in nodes.items() if ndata["type"] == "user"]
        if user_ids:
            from supabase import create_client
            import os
            supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
            profile_res = supabase.table("profiles").select("id, full_name").in_("id", user_ids).execute()
            p_map = {p["id"]: p["full_name"] for p in profile_res.data}
            for uid in user_ids:
                nodes[uid]["full_name"] = p_map.get(uid, "Student")

        return {"nodes": list(nodes.values()), "links": links}
    except Exception as e:
        print(f"Graph Error: {e}")
        return {"nodes": [], "links": []} # Return empty instead of 500