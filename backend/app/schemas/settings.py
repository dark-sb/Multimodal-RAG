from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SystemStatusResponse(BaseModel):
    status: str
    version: str
    ocr_available: bool
    ocr_engine: str
    pymupdf_available: bool
    chromadb_available: bool
    active_llm_provider: str
    active_embedding_provider: str
    gemini_configured: bool
    openai_configured: bool
    max_file_size_mb: int
    allowed_extensions: List[str]
    storage_path: str
    database_path: str
    total_indexed_chunks: int
    total_stored_documents: int
