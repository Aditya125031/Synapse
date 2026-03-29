import os
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# 1. Setup
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

supabase: Client = create_client(url, key)
genai.configure(api_key=gemini_key)

# 2. Expert Content (The "Peer" knowledge)
EXPERT_NOTES = [
    {
        "course": "Operating Systems",
        "content": "Virtual Memory is a storage allocation scheme in which secondary memory can be addressed as though it were part of main memory. The addresses a program may use to reference memory are distinguished from the addresses the memory system uses to identify physical storage locations, and program-generated addresses are translated automatically into the corresponding machine addresses."
    },
    {
        "course": "Operating Systems",
        "content": "A Deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process. The four necessary conditions for deadlock are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait."
    }
]
def get_embedding(text):
    """Generates a 768-dim vector by truncating the Gemini output"""
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        task_type="retrieval_document",
        output_dimensionality=768 # <--- Add this line!
    )
    return result['embedding']

def seed():
    print("🚀 Starting seeding process...")
    
    # PASTE THE REAL ID YOU JUST COPIED RIGHT HERE:
    my_real_user_id = "paste-your-real-36-character-id-here" 
    
    for note in EXPERT_NOTES:
        print(f"Embedding chunk for {note['course']}...")
        vector = get_embedding(note['content'])
        
        data = {
            "user_id": my_real_user_id,
            "course": note['course'].lower(), 
            "content": note['content'],
            "embedding": vector
        }
        
        response = supabase.table("note_chunks").insert(data).execute()
        if response.data:
            print(f"✅ Successfully seeded: {note['content'][:30]}...")
            

if __name__ == "__main__":
    seed()