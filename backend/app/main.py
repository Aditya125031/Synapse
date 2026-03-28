from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, notes, courses # <-- 1. Import your new notes file here

app = FastAPI(title="Synapse Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"]) # <-- 2. Tell FastAPI to use it here
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])

@app.get("/")
def read_root():
    return {"status": "Synapse Core Online"}