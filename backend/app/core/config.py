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
    
    # Vector Database & Embeddings
    QDRANT_URL: Optional[str] = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION_PREFIX: str = os.getenv("QDRANT_COLLECTION_PREFIX", "repomind_code")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
    INDEX_VERSION: str = "v2.0"
    RRF_K: int = int(os.getenv("RRF_K", "60"))
    TOP_K_RETRIEVAL: int = int(os.getenv("TOP_K_RETRIEVAL", "8"))
    MAX_CHUNK_LINES: int = int(os.getenv("MAX_CHUNK_LINES", "100"))
    CHUNK_OVERLAP_LINES: int = int(os.getenv("CHUNK_OVERLAP_LINES", "15"))
    
    # Repositories & Data Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    REPOS_DIR: Path = DATA_DIR / "repositories"
    DB_PATH: Path = DATA_DIR / "repomind.db"
    QDRANT_STORAGE_DIR: Path = DATA_DIR / "qdrant"

    # Ingestion & Safety Limits
    MAX_REPO_SIZE_MB: int = 100
    MAX_FILE_SIZE_BYTES: int = 1024 * 1024  # 1 MB
    MAX_FILES_PER_REPO: int = 2000
    GIT_TIMEOUT_SECONDS: int = 45
    GITHUB_API_BASE: str = "https://api.github.com"
    
    # Active Demo Flag
    DEMO_MODE_DEFAULT: bool = True

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.REPOS_DIR, exist_ok=True)
os.makedirs(settings.QDRANT_STORAGE_DIR, exist_ok=True)
