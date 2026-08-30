import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.db.database import engine, Base
from app.db.models import UserProfile
from app.api import voice, logs, recommendations, profile

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Calora AI - Voice-Driven Nutrition & Fitness API",
    description="Agentic, voice-first fitness and nutrition tracking with Indian cuisine intelligence.",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(voice.router)
app.include_router(logs.router)
app.include_router(recommendations.router)
app.include_router(profile.router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Calora AI Backend",
        "agents": [
            "Master Orchestrator",
            "Intent Parsing Agent",
            "Indian Nutrition Agent",
            "Exercise & MET Agent",
            "Clarification Agent",
            "Personalization & Memory Agent",
            "Proactive Meal Recommender Agent"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
