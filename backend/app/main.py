"""
RepoMind Backend Application Entrypoint.
FastAPI REST Server with CORS, Routing, and Lifecycle Configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RepoMind AI-Powered Codebase Intelligence & Developer Assistant API",
)

# Enable CORS for local Vite frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes under /api
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {
        "service": "RepoMind API",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
