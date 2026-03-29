import os
import json
from typing import TypedDict
from openai import AsyncOpenAI
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv
# Import Synapse models and Neo4j_client
from app.db.neo4j_client import query_graph, neo4j_db
# from app.models.schemas import Note, Course

load_dotenv()

# --- OPENROUTER CONFIGURATION (Copied from CollabQuest) ---
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Models
ROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free"
TUTOR_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

# --- 1. DEFINE THE STATE ---
class AgentState(TypedDict):
    question: str
    user_id: str
    intent: str
    final_response: str
    history: list[dict]

# --- 2. DEFINE THE NODES ---
async def router_node(state: AgentState):
    """Classifies user intent for Synapse."""
    router_prompt = f"""Classify the user's input into EXACTLY ONE category:
    - QUERY_GRAPH: Asking about connections between concepts or searching their saved notes.
    - SUMMARIZE_NOTES: Explicitly asking to summarize their saved notes, database, or a whole course. (DO NOT use this if they just want the AI to shorten its previous chat response).
    - QUIZ_ME: Asking to be tested, quizzed, or for flashcards.
    - GENERATE_ROADMAP: Asking for a study plan or 'what to learn next'.
    - GENERAL_TUTOR: General chat, asking the AI to explain a concept, or asking the AI to modify/shorten its previous response.

    User Input: "{state['question']}"
    Respond with ONLY the category name."""
    
    try:
        completion = await client.chat.completions.create(
            model=ROUTER_MODEL,
            messages=[{"role": "user", "content": router_prompt.format(question=state["question"])}],
            temperature=0.0
        )
        intent = completion.choices[0].message.content.strip().upper()
    except:
        intent = "GENERAL_TUTOR"
        
    return {"intent": intent}

async def graph_query_node(state: AgentState):
    """Retrieves specific node data from Neo4j."""
    # This uses the query_graph function from your neo4j_client
    data = await query_graph(state["question"], state["user_id"])
    context = json.dumps(data) if data else "No specific notes found."
    
    prompt = f"""
    Context from User's Knowledge Graph:
    {context}
    
    Instruction: Answer the user's question based on the context above.
    Question: {state['question']}
    """
    res = await client.chat.completions.create(model=TUTOR_MODEL, messages=[{"role": "user", "content": prompt}])
    return {"final_response": res.choices[0].message.content}

async def summarizer_node(state: AgentState):
    """Handles broad summarization requests."""
    # Fetch all notes for the user
    cypher = "MATCH (n:Note {user_id: $u}) RETURN n.title as title, n.content as content LIMIT 10"
    raw_data = neo4j_db.execute_query(cypher, {"u": state["user_id"]})
    
    summary_prompt = f"Summarize these notes for the user in a professional way:\n{json.dumps(raw_data)}"
    
    response = await client.chat.completions.create(
        model=TUTOR_MODEL,
        messages=[{"role": "user", "content": summary_prompt}]
    )
    return {"final_response": response.choices[0].message.content}

async def quiz_node(state: AgentState):
    """Generates a dynamic quiz from Neo4j content."""
    # Pull real content to generate questions
    cypher = "MATCH (n:Note {user_id: $u}) RETURN n.title as title, n.content as content LIMIT 3"
    data = neo4j_db.execute_query(cypher, {"u": state["user_id"]})
    
    if not data:
        return {"final_response": "I'd love to quiz you, but your knowledge graph is empty! Add some notes first."}

    prompt = f"""
    Create a 3-question Multiple Choice Quiz based ONLY on these notes:
    {json.dumps(data)}
    
    Format the response clearly with Markdown. Provide the answers hidden at the bottom.
    """
    res = await client.chat.completions.create(model=TUTOR_MODEL, messages=[{"role": "user", "content": prompt}])
    return {"final_response": res.choices[0].message.content}

async def roadmap_node(state: AgentState):
    """Creates a learning path based on existing nodes."""
    cypher = "MATCH (n:Note {user_id: $u}) RETURN n.title as title"
    existing_topics = neo4j_db.execute_query(cypher, {"u": state["user_id"]})
    
    prompt = f"""
    The user already knows: {existing_topics}.
    Based on their current graph, suggest a 5-step roadmap of advanced topics they should study next.
    Explain WHY each step is the logical next move.
    """
    res = await client.chat.completions.create(model=TUTOR_MODEL, messages=[{"role": "user", "content": prompt}])
    return {"final_response": res.choices[0].message.content}

async def tutor_node(state: AgentState):
    """Handles general questions, falling back on history."""
    messages_payload = [{"role": "system", "content": "You are Synapse AI, an expert educational tutor. Use markdown."}]
    if state.get("history"):
        messages_payload.extend(state["history"][-4:])
    messages_payload.append({"role": "user", "content": state["question"]})
    
    completion = await client.chat.completions.create(
        model=TUTOR_MODEL,
        messages=messages_payload
    )
    return {"final_response": completion.choices[0].message.content}

# --- 3. BUILD THE GRAPH ---
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("graph_query", graph_query_node)
workflow.add_node("summarizer", summarizer_node)
workflow.add_node("quiz", quiz_node)
workflow.add_node("roadmap", roadmap_node)
workflow.add_node("tutor", tutor_node)

workflow.set_entry_point("router")

def route_decision(state):
    intent = state["intent"]
    if "QUERY_GRAPH" in intent: return "graph_query"
    if "SUMMARIZE" in intent: return "summarizer"
    if "QUIZ" in intent: return "quiz"
    if "ROADMAP" in intent: return "roadmap"
    return "tutor"

workflow.add_conditional_edges("router", route_decision, {
    "graph_query": "graph_query",
    "summarizer": "summarizer",
    "quiz": "quiz",
    "roadmap": "roadmap",   
    "tutor": "tutor"
})

workflow.add_edge("graph_query", END)
workflow.add_edge("summarizer", END)
workflow.add_edge("quiz", END)
workflow.add_edge("roadmap", END)
workflow.add_edge("tutor", END)

chatbot_app = workflow.compile()

async def generate_chat_reply(question: str, user_id: str, history: list = None):
    inputs = {
        "question": question,
        "user_id": user_id,
        "intent": "",
        "final_response": "",
        "history": history or []
    }
    result = await chatbot_app.ainvoke(inputs)
    return result["final_response"]