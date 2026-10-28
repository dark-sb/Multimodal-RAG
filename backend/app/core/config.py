from pathlib import Path
from typing import Set, List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multimodal RAG Studio — AI Document Intelligence Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Storage paths
    STORAGE_DIR: Path = DATA_DIR / "storage"
    PAGES_DIR: Path = DATA_DIR / "pages"
    CHROMA_DIR: Path = DATA_DIR / "chroma"
    DATABASE_PATH: Path = DATA_DIR / "rag_studio.db"
    
    # Upload limits
    ALLOWED_EXTENSIONS: Set[str] = {"pdf", "docx", "txt", "png", "jpg", "jpeg"}
    MAX_FILE_SIZE_MB: int = 50
    
    # RAG Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    TOP_K_RETRIEVAL: int = 5
    
    # Provider configurations (pluggable)
    # Providers: "local_extractive", "gemini", "openai"
    LLM_PROVIDER: str = "local_extractive"
    EMBEDDING_PROVIDER: str = "local"
    
    # API Keys (loaded from env)
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Models
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure necessary data directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.PAGES_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
