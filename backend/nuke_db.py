import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load the environment variables from your backend/.env file
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

def nuke_neo4j():
    """Wipes all Nodes and Relationships from the Knowledge Graph"""
    print("⚠️ Connecting to Neo4j...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
        with driver.session() as session:
            # DETACH DELETE removes all nodes and their connected edges
            result = session.run("MATCH (n) DETACH DELETE n")
            summary = result.consume()
            nodes_deleted = summary.counters.nodes_deleted
            edges_deleted = summary.counters.relationships_deleted
            
        print(f"✅ Neo4j Nuked! Deleted {nodes_deleted} nodes and {edges_deleted} relationships.")
        driver.close()
    except Exception as e:
        print(f"❌ Neo4j Error: {e}")

def manual_supabase_instructions():
    """
    Since Supabase Auth users shouldn't be deleted via the anonymous frontend API key 
    (for security reasons), we use the SQL editor for a clean wipe.
    """
    print("\n⚠️ To wipe Supabase (Postgres):")
    print("1. Go to your Supabase Dashboard -> SQL Editor")
    print("2. Run the following SQL to clear Auth users and cascade delete their data:")
    print("   -------------------------------------------------")
    print("   DELETE FROM auth.users;")
    print("   -------------------------------------------------")
    print("   (This safely deletes all users and their related data if you have foreign keys set up).")

if __name__ == "__main__":
    print("☢️ INITATING SYNAPSE DATABASE WIPE ☢️")
    confirm = input("Are you sure you want to delete ALL data? (yes/no): ")
    
    if confirm.lower() == 'yes':
        nuke_neo4j()
        manual_supabase_instructions()
    else:
        print("Wipe cancelled.")