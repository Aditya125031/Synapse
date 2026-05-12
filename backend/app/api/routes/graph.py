from fastapi import APIRouter, HTTPException
from app.db.neo4j_client import neo4j_db

router = APIRouter()

@router.get("/graph/{course}")
async def get_graph(course: str):
    query = """
    MATCH (c:NoteChunk {course: $course})
    OPTIONAL MATCH (u:User)-[w:WROTE]->(c)
    OPTIONAL MATCH (c)-[ct:CONTRIBUTED_TO]->(m:MasterTopic)
    RETURN u, w, c, ct, m
    """
    
    try:
        results = neo4j_db.execute_query(query, parameters={"course": course})
        
        nodes = {}
        links = []
        
        for record in results:
            u = record.get("u")
            c = record.get("c")
            m = record.get("m")
            w = record.get("w")
            ct = record.get("ct")
            
            if u and u.get("id"):
                nodes[u["id"]] = {"id": u["id"], "type": "user"}
                
            if c and c.get("id"):
                nodes[c["id"]] = {"id": c["id"], "type": "note", "course": c.get("course")}
                
            if m and m.get("id"):
                nodes[m["id"]] = {"id": m["id"], "type": "master", "course": m.get("course")}
                
            if u and c and w is not None:
                links.append({"source": u["id"], "target": c["id"], "type": "WROTE"})
                
            if c and m and ct is not None:
                links.append({"source": c["id"], "target": m["id"], "type": "CONTRIBUTED_TO"})
                
        # Deduplicate links
        unique_links = []
        seen_links = set()
        for link in links:
            t = (link["source"], link["target"], link["type"])
            if t not in seen_links:
                seen_links.add(t)
                unique_links.append(link)
                
        return {
            "nodes": list(nodes.values()),
            "links": unique_links
        }
    except Exception as e:
        print(f"Graph query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph data")
