import os
import asyncio
from neo4j import GraphDatabase
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer

print("🧠 Loading Vector Embedding Model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Embedding Model Loaded!")

class Neo4jConnection:
    def __init__(self):
        # These will come from your AuraDB Free Tier credentials
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USERNAME")
        self.pwd = os.getenv("NEO4J_PASSWORD")
        self.driver = None

    def connect(self):
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.pwd))
        except Exception as e:
            print(f"Failed to create Neo4j driver: {e}")

    def close(self):
        if self.driver is not None:
            self.driver.close()

    def execute_query(self, query, parameters=None):
        if not self.driver:
            self.connect()
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters)
                return [record.data() for record in result]
        except Exception as e:
            print(f"Neo4j Query Error: {e}")
            raise HTTPException(status_code=500, detail="Database operation failed")

# Instantiate the connection to be imported across the app
neo4j_db = Neo4jConnection()

async def query_graph(search_term: str, user_id: str):
    """
    Performs a Semantic Vector Search (RAG) on the user's knowledge graph.
    """
    if not search_term or not user_id:
        return []

    try:
        # 1. TURN WORDS INTO MATH (Vectorization)
        # We convert the user's question into a list of 384 numbers
        query_vector = embedding_model.encode(search_term).tolist()

        # 2. THE VECTOR CYPHER QUERY
        # - MATCH notes belonging to the user that HAVE an embedding
        # - vector.similarity.cosine: Calculates how "close" the question is to the note
        # - WHERE score > 0.3: Filters out completely irrelevant garbage
        query = """
        MATCH (n:Note {user_id: $user_id})
        WHERE n.embedding IS NOT NULL
        
        WITH n, vector.similarity.cosine(n.embedding, $query_vector) AS score
        WHERE score > 0.3 
        ORDER BY score DESC
        LIMIT 5
        
        // Still grab the connected graph concepts!
        OPTIONAL MATCH (n)-[]-(related:Note)
        
        RETURN n.title AS title, 
               n.content AS content, 
               collect(DISTINCT related.title) AS connected_concepts,
               score
        """
        
        parameters = {
            "user_id": user_id,
            "query_vector": query_vector
        }
        
        # 3. EXECUTE THE SEARCH
        results = await asyncio.to_thread(neo4j_db.execute_query, query, parameters)
        
        # 4. CLEAN THE DATA
        cleaned_data = []
        for record in results:
            cleaned_data.append({
                "title": record.get("title", "Untitled Concept"),
                "content": record.get("content", ""),
                "connected_concepts": [c for c in record.get("connected_concepts", []) if c],
                "relevance_score": round(record.get("score", 0), 2) # Just for debugging
            })
            
        return cleaned_data
        
    except Exception as e:
        print(f"❌ Error performing Vector Search for '{search_term}': {e}")
        return []