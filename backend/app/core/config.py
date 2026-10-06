import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "RepoMind"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API Keys & Services
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN", "")
    
    # Vector Database
    QDRANT_URL: Optional[str] = os.getenv("QDRANT_URL", ":memory:")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY", "")
    
    # Repositories & Data Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    REPOS_DIR: Path = DATA_DIR / "repositories"
    
    # Active Demo Flag
    DEMO_MODE_DEFAULT: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.REPOS_DIR, exist_ok=True)
