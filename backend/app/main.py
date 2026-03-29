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
                "id": "gap_acid_deep",
                "trigger_keywords": ["isolation", "consistency", "durability", "atomicity"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: ACID Deep-Dive",
                "ghost_note": "Your notes are missing the technical nuances of ACID. \n\n• Consistency: Ensures a transaction transforms the database from one valid state to another, strictly following all DB rules. \n• Isolation: Crucial for concurrency! It ensures transactions don't interfere, preventing 'dirty reads' via locking protocols. \n• Durability: Guarantees that once a transaction is committed, it remains so even in the event of a system failure."
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

# ==========================================from fastapi import FastAPI, UploadFile, File, Form
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
# Updated with High-Density technical content for the demo
PERFECT_HIVE = {
    "bcnf": {
        "title": "Boyce-Codd Normal Form",
        "core_concepts": [
            {
                "id": "gap_candidate_key",
                "trigger_keywords": ["candidate key", "determinant", "stricter"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: The BCNF Rule",
                "ghost_note": "BCNF is a stricter implementation of 3NF used to eliminate all remaining functional dependency anomalies. Specifically: A relation is in BCNF if and only if for every non-trivial functional dependency A -> B, the antecedent 'A' is a Superkey. In simpler terms: 'The functional dependency must stay within the key.' If a determinant is not a candidate key, you have a BCNF violation."
            },
            {
                "id": "gap_dependency",
                "trigger_keywords": ["preserve", "lossless", "dependency"],
                "gap_type": "missing_connection",
                "title": "Hive Correction: The Trade-off",
                "ghost_note": "It is critical to understand the BCNF vs 3NF trade-off for your exam. While BCNF guarantees a higher level of data integrity by ensuring lossless decomposition (no data lost during splits), it does NOT always guarantee Functional Dependency Preservation. This means some business rules (dependencies) might require a JOIN to verify across tables, which is why 3NF is sometimes preferred in high-performance production environments."
            }
        ]
    },
    "acid": {
        "title": "ACID Properties",
        "core_concepts": [
            {
                "id": "gap_acid_deep",
                "trigger_keywords": ["isolation", "consistency", "durability", "atomicity"],
                "gap_type": "missing_definition",
                "title": "Hive Correction: ACID Deep-Dive",
                "ghost_note": "Your notes touch on ACID but lack the technical rigor required for system design. \n\n• Atomicity: Implemented via 'Undo/Redo Logs' to ensure all-or-nothing execution. \n• Consistency: Guarantees the DB moves from one valid state to another, strictly enforcing all 'Integrity Constraints' (Foreign Keys, Check Constraints). \n• Isolation: The most complex! It manages concurrency using 'Locking Protocols' or 'Multiversion Concurrency Control (MVCC)' to prevent Dirty Reads and Phantom Reads. \n• Durability: Ensures committed data survives system crashes via 'Write-Ahead Logging (WAL)' and non-volatile storage."
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
    community_weight = min(upvotes * 0.05, 0.40)  
    reputation_weight = min(uploader_cq / 1000, 0.30) 
    ai_weight = 1.0 - (community_weight + reputation_weight)
    final_score = (ai_base_confidence * ai_weight) + (1.0 * community_weight) + (1.0 * reputation_weight)
    return min(int(final_score * 100), 99) 

# ==========================================
# EXPANDED KNOWLEDGE BASE FOR PDF INJECTION
# ==========================================
PERFECT_HIVE_DB = {
    "indexing": "Indexing Architecture: B-Trees (Balanced Trees) provide O(log N) complexity and are highly optimized for range queries and inequality filters (<, >). In contrast, Hash Indexes provide O(1) performance but only for equality matches. Most modern RDBMS use B+Trees to keep data pointers only at leaf nodes, maximizing the fan-out ratio and reducing disk I/O.",
    "normalization": "Normalization Theory: The goal is to minimize data redundancy and avoid insertion/deletion anomalies. 1NF requires atomic values; 2NF removes partial dependencies; 3NF removes transitive dependencies (non-key attributes depending on other non-key attributes). Higher forms like 4NF and 5NF deal with multi-valued and join dependencies respectively.",
    "acid": "The ACID Paradigm: A fundamental set of properties that guarantee database transactions are processed reliably. Without Isolation levels (like Serializable or Repeatable Read), concurrent users would cause race conditions, leading to corrupted financial or inventory data.",
    "virtual memory": "Advanced Virtual Memory: This abstraction allows a system to address more memory than is physically available. It uses 'Demand Paging' to load pages into RAM only when needed. When the 'Page Table' fails to find a mapping, a 'Page Fault' is triggered, prompting the OS to fetch the page from the Swap Space on the disk. Excessive page faults lead to 'Thrashing,' where the CPU spends more time swapping than executing."
}

SEARCHABLE_HIVE_DATA = [
    {
        "course": "DBMS",
        "title": "ACID: Isolation Levels",
        "text": "Isolation ensures that concurrent transactions do not result in inconsistency. Standard levels include Read Uncommitted, Read Committed, Repeatable Read, and Serializable (the strictest level which prevents Phantom Reads)."
    },
    {
        "course": "DBMS",
        "title": "ACID: Consistency Rules",
        "text": "Consistency ensures a transaction transforms the database from one valid state to another. This involves maintaining all predefined integrity rules, including unique constraints, foreign keys, and trigger-based validation."
    },
    {
        "course": "DBMS",
        "title": "BCNF vs 3NF",
        "text": "While 3NF allows some redundancy to preserve all functional dependencies, BCNF is stricter and may lose dependency preservation. BCNF is required when a table has multiple overlapping candidate keys."
    },
    {
        "course": "OS",
        "title": "Virtual Memory: Paging",
        "text": "Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. This permits the physical address space of a process to be non-contiguous, solving the issue of external fragmentation."
    }
]

@app.get("/api/search")
async def search_hive(q: str):
    query = q.lower()
    results = [
        item for item in SEARCHABLE_HIVE_DATA 
        if query in item["title"].lower() or query in item["text"].lower() or query in item["course"].lower()
    ]
    return results

@app.post("/api/inject")
async def analyze_and_seed_hive(
    file: UploadFile = File(...), 
    course: str = Form(...), 
    subtopic: str = Form(None)
):
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())

    extracted_text = ""
    try:
        doc = fitz.open(temp_file_path)
        for page in doc:
            extracted_text += page.get_text().lower()
        doc.close()
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    suggestions = []
    target_topic = subtopic.lower() if subtopic else ""

    if target_topic in PERFECT_HIVE_DB:
        # Improved detection logic: Trigger if key technical terms are missing
        if "paging" not in extracted_text and "swapping" not in extracted_text:
            suggestions.append({
                "id": f"gap_{target_topic.replace(' ', '_')}",
                "title": f"Hive Correction: {target_topic.upper()}",
                "content": PERFECT_HIVE_DB[target_topic],
                "gap_type": "missing_definition",
                "trust_score": 45,
                "source_doc": "Verified_Collective_Syllabus.pdf"
            })
    else:
        suggestions.append({
                "id": "gap_unknown",
                "title": f"Hive Analysis: {target_topic.upper() if target_topic else course}",
                "content": "No critical missing gaps found in the Collective Hive for this specific document. Your coverage appears consistent with peer modules.",
                "gap_type": "missing_connection",
                "trust_score": 85,
                "source_doc": "System Analysis"
            })

    return {
        "status": "success",
        "suggestions": suggestions,
        "chunks_embedded": len(suggestions)
    }


@app.post("/api/stitch")
async def run_stitcher_engine(request: StitchRequest):
    time.sleep(0.8) 
    
    text = request.raw_text.lower()
    topic = request.subtopic.lower()
    
    gaps_found = []
    
    if topic in PERFECT_HIVE:
        hive_data = PERFECT_HIVE[topic]
        for concept in hive_data["core_concepts"]:
            has_concept = any(word in text for word in concept["trigger_keywords"])
            
            if not has_concept:
                gaps_found.append({
                    "id": concept["id"],
                    "title": concept["title"],
                    "content": concept["ghost_note"],
                    "gap_type": concept["gap_type"],
                    "trust_score": 98, 
                    "source": "Verified Collective Hive"
                })
                
    else:
        gaps_found.append({
            "id": "gap_unknown",
            "title": "Hive Analysis",
            "content": "The Collective Hive is still building context for this specific topic. Try focusing on core definitions or uploading a reference PDF to seed the network.",
            "gap_type": "missing_definition",
            "trust_score": 50,
            "source": "System Default"
        })

    return {
        "status": "success",
        "analyzed_topic": topic,
        "gaps_detected": len(gaps_found),
        "ghost_notes": gaps_found
    }