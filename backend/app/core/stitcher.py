import os
import json
import re
import google.generativeai as genai
from supabase import create_client, Client

# --- Setup ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCCRKP9baiLtx2yBqpzzExGZAo_-u0Xk_g")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hboquzvtzfcimmghjtwx.supabase.co")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib3F1enZ0emZjaW1tZ2hqdHd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY4OTYyNCwiZXhwIjoyMDkwMjY1NjI0fQ.A-XaVr1x2fW3VJaZGAHwOgbpyW3XWIio3aqCrmJ5x-o",
)

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
flash_model = genai.GenerativeModel("gemini-1.5-flash")


def _get_embedding(text: str) -> list[float]:
    """Embeds a string into a 768-dim vector using Gemini."""
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        task_type="retrieval_query",
        output_dimensionality=768,
    )
    return result["embedding"]


def _fetch_peer_context(user_vector: list[float], course: str, exclude_user_id: str) -> str:
    """
    Tries to fetch similar peer notes from Supabase via the match_peer_notes RPC.
    Falls back gracefully if the table/function doesn't exist yet.
    """
    try:
        result = supabase.rpc(
            "match_peer_notes",
            {
                "query_embedding": user_vector,
                "match_threshold": 0.35,
                "match_count": 5,
                "current_user_id": exclude_user_id,
                "target_course": course,
            },
        ).execute()
        if result.data:
            return "\n---\n".join([row["content"] for row in result.data])
    except Exception as e:
        print(f"[Stitcher] Peer context fetch skipped (DB not ready): {e}")

    # Fallback: try the plain note_chunks table
    try:
        result = (
            supabase.table("note_chunks")
            .select("content")
            .eq("course", course)
            .neq("user_id", exclude_user_id)
            .limit(5)
            .execute()
        )
        if result.data:
            return "\n---\n".join([row["content"] for row in result.data])
    except Exception as e2:
        print(f"[Stitcher] Fallback fetch also failed: {e2}")

    return ""


def _run_gemini_stitch(user_note: str, peer_context: str) -> list[dict]:
    """
    Calls Gemini Flash to identify gaps in the user's note and return Ghost Notes.
    Handles both peer-aware and peer-less modes.
    """
    if peer_context.strip():
        prompt = f"""You are Synapse, an AI that helps students strengthen their notes using collective intelligence.

A student wrote this note (possibly incomplete or messy):
\"\"\"
{user_note}
\"\"\"

Here is what their peers wrote about the same topic:
\"\"\"
{peer_context}
\"\"\"

Identify 2-3 key concepts or ideas that are MISSING from the student's note but present in peer notes.
For each gap, create a "Ghost Note" — a short, clear 1-2 sentence insight the student can add.

Respond ONLY with a valid JSON array, no markdown, no explanation. Format:
[
  {{"title": "Short concept title", "content": "The insight to add.", "gap_type": "missing_definition|incomplete_example|missing_connection"}},
  ...
]"""
    else:
        # No peer context — still give useful suggestions using Gemini's knowledge
        prompt = f"""You are Synapse, an AI that helps students strengthen their notes.

A student wrote this note (possibly incomplete or messy):
\"\"\"
{user_note}
\"\"\"

Based on the topic, identify 2-3 key concepts that appear to be MISSING or UNDERDEVELOPED in these notes.
For each gap, create a "Ghost Note" — a short, clear 1-2 sentence insight the student should add.

Respond ONLY with a valid JSON array, no markdown, no explanation. Format:
[
  {{"title": "Short concept title", "content": "The insight to add.", "gap_type": "missing_definition|incomplete_example|missing_connection"}},
  ...
]"""

    response = flash_model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if Gemini wrapped the JSON
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        print(f"[Stitcher] JSON parse failed. Raw: {raw[:200]}")

    # Last resort: return a graceful fallback
    return [
        {
            "title": "Suggestion Unavailable",
            "content": "Gemini returned an unexpected format. Try again with more text.",
            "gap_type": "error",
        }
    ]


def generate_stitcher_output(
    user_note: str,
    course: str = "general",
    user_id: str = "anonymous",
) -> dict:
    """
    Main entry point for the Stitcher Engine.
    Returns ghost_notes list and gap_summary string.
    """
    print(f"[Stitcher] Running for course='{course}', len={len(user_note)}")

    # Step 1: Embed user note
    try:
        user_vector = _get_embedding(user_note)
    except Exception as e:
        print(f"[Stitcher] Embedding failed: {e}")
        user_vector = []

    # Step 2: Fetch peer context
    peer_context = ""
    if user_vector:
        peer_context = _fetch_peer_context(user_vector, course, user_id)

    has_peers = bool(peer_context.strip())
    print(f"[Stitcher] Peer context found: {has_peers}")

    # Step 3: Generate ghost notes via Gemini
    ghost_notes = _run_gemini_stitch(user_note, peer_context)

    # Step 4: Build gap summary
    gap_count = len(ghost_notes)
    if has_peers:
        gap_summary = f"Found {gap_count} knowledge gap{'s' if gap_count != 1 else ''} compared to {sum(1 for _ in peer_context.split('---'))} peer notes."
    else:
        gap_summary = f"Found {gap_count} knowledge gap{'s' if gap_count != 1 else ''} using AI analysis (no peer data yet)."

    return {
        "ghost_notes": ghost_notes,
        "gap_summary": gap_summary,
        "peer_context_used": has_peers,
        "gaps_found": gap_count,
    }