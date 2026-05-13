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
    # Notice we are matching by chapter_id now!
    query_notes = """
    MATCH (n:Note {chapter_id: $chapter_id})
    OPTIONAL MATCH (u:User)-[w:UPLOADED]->(n)
    OPTIONAL MATCH (n)-[ct:CONTRIBUTED_TO]->(m:MasterTopic)
    RETURN u, w, n, ct, m
    """
    
    query_ghosts = """
    MATCH (g:GhostNote {chapter_id: $chapter_id})
    OPTIONAL MATCH (ug:User)-[rg:RECEIVED_GHOST]->(g)
    OPTIONAL MATCH (g)-[df:DERIVED_FROM]->(m:MasterTopic)
    RETURN ug, rg, g, df, m
    """
    
    try:
        results_notes = neo4j_db.execute_query(query_notes, parameters={"chapter_id": chapter_id})
        results_ghosts = neo4j_db.execute_query(query_ghosts, parameters={"chapter_id": chapter_id})
        
        nodes = {}
        links = []
        
        for record in results_notes:
            u = record.get("u")
            n = record.get("n")
            m = record.get("m")
            w = record.get("w")
            ct = record.get("ct")
            
            if u and u.get("id"):
                nodes[u["id"]] = {"id": u["id"], "type": "user"}
            if n and n.get("id"):
                nodes[n["id"]] = {"id": n["id"], "type": "note", "title": n.get("title", "Note")}
            if m and m.get("id"):
                nodes[m["id"]] = {"id": m["id"], "type": "master"}
                
            if u and n and w is not None:
                links.append({"source": u["id"], "target": n["id"], "type": "UPLOADED"})
            if n and m and ct is not None:
                links.append({"source": n["id"], "target": m["id"], "type": "CONTRIBUTED_TO"})

        for record in results_ghosts:
            ug = record.get("ug")
            g = record.get("g")
            m = record.get("m")
            rg = record.get("rg")
            df = record.get("df")
            
            if ug and ug.get("id"):
                nodes[ug["id"]] = {"id": ug["id"], "type": "user"}
            if g and g.get("id"):
                nodes[g["id"]] = {"id": g["id"], "type": "ghost", "title": g.get("title", "Ghost Note")}
            if m and m.get("id"):
                nodes[m["id"]] = {"id": m["id"], "type": "master"}
                
            if ug and g and rg is not None:
                links.append({"source": ug["id"], "target": g["id"], "type": "RECEIVED_GHOST"})
            if g and m and df is not None:
                links.append({"source": g["id"], "target": m["id"], "type": "DERIVED_FROM"})
                
        # Deduplicate links
        unique_links = []
        seen_links = set()
        for link in links:
            t = (link["source"], link["target"], link["type"])
            if t not in seen_links:
                seen_links.add(t)
                unique_links.append(link)

        # Phase 8: Fetch user profiles for User nodes
        user_ids = [node["id"] for node in nodes.values() if node["type"] == "user"]
        if user_ids:
            try:
                profiles_res = supabase.table("profiles").select("id, full_name, avatar_url").in_("id", user_ids).execute()
                profiles_map = {p["id"]: p for p in profiles_res.data}
                
                for node_id, node_data in nodes.items():
                    if node_data["type"] == "user":
                        if node_id in profiles_map:
                            node_data["full_name"] = profiles_map[node_id].get("full_name") or "Student"
                            node_data["avatar_url"] = profiles_map[node_id].get("avatar_url")
                        else:
                            node_data["full_name"] = "Student"
            except Exception as prof_err:
                print(f"Failed to fetch profiles: {prof_err}")
                
        return {
            "nodes": list(nodes.values()),
            "links": unique_links
        }
    except Exception as e:
        print(f"Graph query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph data")