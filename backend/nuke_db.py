import os
from neo4j import GraphDatabase
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # Must be the Service Role Key

def nuke_neo4j():
    print("⚠️ Connecting to Neo4j...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
        with driver.session() as session:
            result = session.run("MATCH (n) DETACH DELETE n")
            summary = result.consume()
        print(f"✅ Neo4j Nuked! Deleted {summary.counters.nodes_deleted} nodes.")
        driver.close()
    except Exception as e:
        print(f"❌ Neo4j Error: {e}")

def nuke_supabase():
    print("⚠️ Wiping Supabase Application Data...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # We use .neq("id", "00000000-0000-0000-0000-000000000000") as a hack 
        # to select ALL rows in the REST API. 
        # We must delete in this exact order to avoid Foreign Key blockages.
        supabase.table("note_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("chapters").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("courses").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # Reset everyone's reputation back to 0
        supabase.table("profiles").update({"reputation": 0}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        print("✅ Supabase Data Nuked! (Auth users kept for easy re-testing)")
    except Exception as e:
        print(f"❌ Supabase Error: {e}")

if __name__ == "__main__":
    print("☢️ INITATING SYNAPSE DATABASE WIPE ☢️")
    confirm = input("Are you sure you want to delete ALL data? (yes/no): ")
    if confirm.lower() == 'yes':
        nuke_neo4j()
        nuke_supabase()
    else:
        print("Wipe cancelled.")