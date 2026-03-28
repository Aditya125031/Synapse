import os
from neo4j import GraphDatabase
from fastapi import HTTPException

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