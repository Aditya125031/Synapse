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
        
        # We must delete in this exact order (Bottom-Up) to avoid Foreign Key blockages!
        tables_to_nuke = [
            "master_notes",   # AI generated master notes
            "note_chunks",    # Vectorized chunks
            "notes",          # Parent notes
            "chapters",       # Chapters
            "courses",        # Courses
            "class_members",  # Memberships
            "classes"         # Top-level Classes
        ]
        
        for table in tables_to_nuke:
            try:
                # We use .neq("id", "00...") as a hack to select ALL rows in the REST API.
                supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                print(f"  🧹 Cleared table: {table}")
            except Exception as e:
                print(f"  ⚠️ Skipped table: {table} (Might not exist yet or is already empty)")
        
        # Reset everyone's reputation back to 0
        try:
            supabase.table("profiles").update({"reputation": 0}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print("  🔄 Reset all user reputations to 0")
        except Exception:
            pass
            
        print("✅ Supabase Data Nuked! (Auth users kept for easy re-testing)")
    except Exception as e:
        print(f"❌ Supabase Connection Error: {e}")

if __name__ == "__main__":
    print("☢️ INITATING SYNAPSE DATABASE WIPE ☢️")
    confirm = input("Are you sure you want to delete ALL data? (yes/no): ")
    if confirm.lower() == 'yes':
        nuke_neo4j()
        nuke_supabase()
    else:
        print("Wipe cancelled.")