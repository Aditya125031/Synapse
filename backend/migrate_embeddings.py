import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

# Load your .env file credentials
load_dotenv()
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USERNAME")
PWD = os.getenv("NEO4J_PASSWORD")

print("🧠 Loading local Vector AI Model (This might take a few seconds the first time)...")
model = SentenceTransformer("all-MiniLM-L6-v2")

def upgrade_database():
    print("🔌 Connecting to Neo4j Aura...")
    try:
        driver = GraphDatabase.driver(URI, auth=(USER, PWD))
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return

    with driver.session() as session:
        # 1. Grab every note that doesn't have an embedding yet
        print("🔍 Scanning graph for un-embedded notes...")
        result = session.run("MATCH (n:Note) WHERE n.embedding IS NULL RETURN elementId(n) AS node_id, n.title AS title, n.content AS content")
        notes = [record.data() for record in result]
        
        if not notes:
            print("✨ All notes are already embedded! You are good to go.")
            return

        print(f"⚙️ Found {len(notes)} notes. Generating mathematical embeddings...")
        
        # 2. Process them one by one
        for note in notes:
            title = note.get('title') or ""
            content = note.get('content') or ""
            
            # Combine the title and content so the AI has maximum context
            text_to_embed = f"{title}. {content}"
            
            # Generate the 384-dimensional vector (this is the magic part)
            vector = model.encode(text_to_embed).tolist()
            
            # 3. Save the vector back into that specific Neo4j node
            session.run("""
                MATCH (n:Note) WHERE elementId(n) = $node_id
                SET n.embedding = $vector
            """, {"node_id": note['node_id'], "vector": vector})
            
            print(f"   ✅ Upgraded: {title}")

    driver.close()
    print("🎉 Database Migration Complete! Your Synapse Graph is now semantically aware.")

if __name__ == "__main__":
    upgrade_database()