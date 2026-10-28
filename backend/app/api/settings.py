import shutil
import fitz
from fastapi import APIRouter
from app.core.config import settings
from app.database.connection import get_db
from app.services.retrieval.vector_store import get_vector_store
from app.schemas.settings import SystemStatusResponse

router = APIRouter(prefix="", tags=["settings"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@router.get("/settings/status", response_model=SystemStatusResponse)
def get_system_status():
    tesseract_found = shutil.which("tesseract") is not None
    
    # Active providers
    llm_prov = "Local Grounded Synthesis Engine"
    if settings.GEMINI_API_KEY:
        llm_prov = f"Google Gemini ({settings.GEMINI_MODEL})"
    elif settings.OPENAI_API_KEY:
        llm_prov = f"OpenAI ({settings.OPENAI_MODEL})"

    emb_prov = "Local Semantic Hashing Vectorizer (384-dim)"
    if settings.EMBEDDING_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        emb_prov = "Google Gemini text-embedding-004"
    elif settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        emb_prov = "OpenAI text-embedding-3-small"

    total_chunks = 0
    try:
        total_chunks = get_vector_store().count()
    except Exception:
        pass

    total_docs = 0
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM documents")
        row = cursor.fetchone()
        if row:
            total_docs = row["cnt"]

    return SystemStatusResponse(
        status="healthy",
        version=settings.VERSION,
        ocr_available=tesseract_found,
        ocr_engine="Tesseract OCR" if tesseract_found else "PyMuPDF Direct Text & Table Extraction",
        pymupdf_available=True,
        chromadb_available=True,
        active_llm_provider=llm_prov,
        active_embedding_provider=emb_prov,
        gemini_configured=bool(settings.GEMINI_API_KEY),
        openai_configured=bool(settings.OPENAI_API_KEY),
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
        allowed_extensions=sorted(list(settings.ALLOWED_EXTENSIONS)),
        storage_path=str(settings.STORAGE_DIR),
        database_path=str(settings.DATABASE_PATH),
        total_indexed_chunks=total_chunks,
        total_stored_documents=total_docs
    )
