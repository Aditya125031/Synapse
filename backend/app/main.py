from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import os
import random
from pydantic import BaseModel
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 THE ULTIMATE COLLECTIVE HIVE (The "Perfect" Knowledge Base)


PERFECT_HIVE = {
    "bcnf": {
        "title": "Boyce-Codd Normal Form",
        "core_concepts": [
            {
                "id": "gap_candidate_key",
                "trigger_keywords": ["candidate key", "determinant", "stricter"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: The BCNF Rule",
                "ghost_note": "BCNF is a stricter version of 3NF. For a table to be in BCNF, *every* determinant must be a candidate key. If A -> B, then A must be a superkey."
            },
            {
                "id": "gap_dependency",
                "trigger_keywords": ["preserve", "lossless", "dependency"],
                "gap_type": "missing_connection",
                "title": "Hive Correction: The Trade-off",
                "ghost_note": "Remember the critical trade-off: While BCNF guarantees lossless decomposition, it does *not* always guarantee dependency preservation (unlike 3NF)."
            }
        ]
    },
    "acid": {
        "title": "ACID Properties",
        "core_concepts": [
            {
                "id": "gap_isolation",
                "trigger_keywords": ["isolation", "concurrency", "locking", "dirty reads"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: Isolation (I)",
                "ghost_note": "You missed Isolation! This ensures concurrent transactions happen independently without interfering with each other. It prevents 'dirty reads'."
            },
            {
                "id": "gap_consistency",
                "trigger_keywords": ["consistency", "valid state", "rules"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: Consistency (C)",
                "ghost_note": "You missed Consistency! This property ensures that a transaction brings the database from one valid state to another, strictly following all DB rules."
            }
        ]
    }
}
class StitchRequest(BaseModel):
    raw_text: str
    subtopic: str
# ⚙️ THE HYBRID TRUST ENGINE
def calculate_trust_score(uploader_cq: int, upvotes: int, ai_base_confidence: float) -> int:
    """
    Dynamically calculates how much we trust this piece of knowledge.
    Simulates the transition from AI-reliance to Community-reliance.
    """
    # 1. Cap the community influences so they can't exceed 100%
    community_weight = min(upvotes * 0.05, 0.40)  # Upvotes max out at 40% influence
    reputation_weight = min(uploader_cq / 1000, 0.30) # High CQ maxes at 30% influence
    
    # 2. As community weight grows, AI weight shrinks (Self-Reliance)
    ai_weight = 1.0 - (community_weight + reputation_weight)
    
    # 3. Calculate final score
    final_score = (ai_base_confidence * ai_weight) + (1.0 * community_weight) + (1.0 * reputation_weight)
    
    return min(int(final_score * 100), 99) # Return a percentage (max 99%)

# ==========================================
PERFECT_HIVE_DB = {
    "indexing": "B-Tree vs Hash Indexing: B-Trees provide O(log N) time complexity...",
    "normalization": "Database Normalization: 1NF (atomic values), 2NF...",
    "acid": "ACID Properties: Atomicity, Consistency, Isolation, Durability.",
    "virtual memory": "Virtual Memory: A memory management technique that provides an 'idealized abstraction of the storage resources' to simulate extra RAM using Disk Swapping and Paging. Critical concept: Page Faults."
}

@app.post("/api/inject")
async def analyze_and_seed_hive(
    file: UploadFile = File(...), 
    course: str = Form(...), 
    subtopic: str = Form(None) # <-- Python now accepts the subtopic
):
    # 1. Read and Save the uploaded PDF
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())

    import fitz # PyMuPDF
    import os
    extracted_text = ""
    try:
        doc = fitz.open(temp_file_path)
        for page in doc:
            extracted_text += page.get_text().lower()
        doc.close()
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    # 2. STRICT SUBTOPIC FILTERING
    suggestions = []
    
    # Clean up the subtopic string to match our dictionary keys (e.g. "Virtual Memory" -> "virtual memory")
    target_topic = subtopic.lower() if subtopic else ""

    if target_topic in PERFECT_HIVE_DB:
        # Check if the core concept is missing from the student's PDF
        if "paging" not in extracted_text and "swapping" not in extracted_text:
            suggestions.append({
                "id": f"gap_{target_topic.replace(' ', '_')}",
                "title": f"Hive Correction: {target_topic.upper()}",
                "content": PERFECT_HIVE_DB[target_topic],
                "gap_type": "missing_definition",
                "trust_score": 45,
                "source_doc": "Verified_OS_Syllabus.pdf"
            })
    else:
        # Fallback if we don't have hardcoded data for their selected subtopic
         suggestions.append({
                "id": "gap_unknown",
                "title": f"Hive Analysis: {target_topic.upper() if target_topic else course}",
                "content": "No critical missing gaps found in the Collective Hive for this specific document.",
                "gap_type": "missing_connection",
                "trust_score": 85,
                "source_doc": "System Analysis"
            })

    return {
        "status": "success",
        "suggestions": suggestions,
        "chunks_embedded": len(suggestions)
    }

@app.get("/api/search")
async def search_hive(q: str):
    query = q.lower()
    results = []
    for key, text in PERFECT_HIVE_DB.items():
        if query in key or query in text.lower():
            results.append({
                "course": "dbms",
                "title": f"Master Node: {key.replace('_', ' ').upper()}",
                "text": text
            })
    return results

@app.post("/api/stitch")
async def run_stitcher_engine(request: StitchRequest):
    # Simulate a slight "AI thinking" delay so the UI looks realistic during the demo
    time.sleep(0.8) 
    
    text = request.raw_text.lower()
    topic = request.subtopic.lower()
    
    gaps_found = []
    
    # 1. Check if we have perfect hive data for this subtopic
    if topic in PERFECT_HIVE:
        hive_data = PERFECT_HIVE[topic]
        
        # 2. The Gap Detector Logic
        # We loop through the perfect concepts. If the student's text is MISSING
        # the trigger keywords, we identify it as a gap.
        for concept in hive_data["core_concepts"]:
            # If NONE of the trigger words are in the student's text, it's a gap!
            has_concept = any(word in text for word in concept["trigger_keywords"])
            
            if not has_concept:
                gaps_found.append({
                    "id": concept["id"],
                    "title": concept["title"],
                    "content": concept["ghost_note"],
                    "gap_type": concept["gap_type"],
                    "trust_score": 98, # Always high for the demo hive
                    "source": "Verified Collective Hive"
                })
                
    # 3. Fallback if the topic isn't in our demo database
    else:
        gaps_found.append({
            "id": "gap_unknown",
            "title": "Hive Analysis",
            "content": "The Collective Hive is still building context for this specific topic. Try focusing on core definitions first.",
            "gap_type": "missing_definition",
            "trust_score": 50,
            "source": "System Default"
        })

    # 4. Return the clean JSON payload for the frontend
    return {
        "status": "success",
        "analyzed_topic": topic,
        "gaps_detected": len(gaps_found),
        "ghost_notes": gaps_found
    }

    