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
                weight = ct.get("weight", 1.0) if hasattr(ct, "get") else dict(ct).get("weight", 1.0) if hasattr(ct, "items") else 1.0
                links.append({"source": n["id"], "target": m["id"], "type": "CONTRIBUTED_TO", "weight": weight})

        for record in results_ghosts:
            ug = record.get("ug")
            g = record.get("g")
            m = record.get("m")
            rg = record.get("rg")
            df = record.get("df")
            
            if ug and ug.get("id"):
                nodes[ug["id"]] = {"id": ug["id"], "type": "user"}
            if g and g.get("id"):
                nodes[g["id"]] = {"id": g["id"], "type": "ghost", "title": g.get("title", "Ghost Note"), "content": g.get("content", "")}
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
                
                emails_map = {}
                try:
                    for uid in user_ids:
                        user_data = supabase.auth.admin.get_user_by_id(uid)
                        if user_data and user_data.user and user_data.user.email:
                            emails_map[uid] = user_data.user.email.split("@")[0]
                except Exception as auth_err:
                    print(f"Auth fetch error: {auth_err}")

                for node_id, node_data in nodes.items():
                    if node_data["type"] == "user":
                        full_name = None
                        if node_id in profiles_map:
                            full_name = profiles_map[node_id].get("full_name")
                            node_data["avatar_url"] = profiles_map[node_id].get("avatar_url")
                        
                        if not full_name:
                            full_name = emails_map.get(node_id)
                            
                        node_data["full_name"] = full_name or "Student"
            except Exception as prof_err:
                print(f"Failed to fetch profiles: {prof_err}")

        # Phase 17: Fetch ghost note contents from Supabase
        ghost_ids = [node["id"] for node in nodes.values() if node["type"] == "ghost"]
        if ghost_ids:
            try:
                ghosts_res = supabase.table("ghost_notes").select("id, content").in_("id", ghost_ids).execute()
                ghosts_map = {g["id"]: g for g in ghosts_res.data}
                for node_id, node_data in nodes.items():
                    if node_data["type"] == "ghost" and node_id in ghosts_map:
                        node_data["content"] = ghosts_map[node_id].get("content")
            except Exception as e:
                print(f"Ghost notes fetch error: {e}")
                
        return {
            "nodes": list(nodes.values()),
            "links": unique_links
        }
    except Exception as e:
        print(f"Graph query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph data")