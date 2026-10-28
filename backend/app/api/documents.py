import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from app.core.config import settings
from app.database.connection import get_db
from app.services.ingestion.document_parser import get_ingestion_service
from app.services.retrieval.vector_store import get_vector_store
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentPageResponse,
    DocumentChunkResponse,
    DocumentUploadResponse,
    DocumentBatchUploadResponse,
    DashboardStatsResponse
)

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_stats():
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT status, COUNT(*) as cnt FROM documents GROUP BY status")
        status_counts = {row["status"]: row["cnt"] for row in cursor.fetchall()}
        
        cursor.execute("SELECT SUM(page_count) as total_pages, SUM(chunk_count) as total_chunks FROM documents")
        totals = cursor.fetchone()
        
        cursor.execute("SELECT * FROM documents ORDER BY created_at DESC LIMIT 6")
        recent_docs = [
            DocumentResponse(
                id=r["id"],
                filename=r["filename"],
                file_type=r["file_type"],
                file_size=r["file_size"],
                page_count=r["page_count"] or 0,
                chunk_count=r["chunk_count"] or 0,
                status=r["status"],
                error_message=r["error_message"],
                created_at=str(r["created_at"]),
                updated_at=str(r["updated_at"]),
                metadata=json.loads(r["metadata_json"]) if r["metadata_json"] else None
            )
            for r in cursor.fetchall()
        ]

        cursor.execute("SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 5")
        recent_convs = [
            {"id": c["id"], "title": c["title"], "updated_at": str(c["updated_at"])}
            for c in cursor.fetchall()
        ]

    total_docs = sum(status_counts.values())
    return DashboardStatsResponse(
        total_documents=total_docs,
        completed_documents=status_counts.get("completed", 0),
        processing_documents=status_counts.get("processing", 0),
        failed_documents=status_counts.get("failed", 0),
        total_pages=int(totals["total_pages"] or 0) if totals else 0,
        total_chunks=int(totals["total_chunks"] or 0) if totals else 0,
        recent_documents=recent_docs,
        recent_conversations=recent_convs
    )

@router.post("/upload", response_model=DocumentBatchUploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    ingestion_service = get_ingestion_service()
    uploaded_docs = []
    errors = []

    for file in files:
        try:
            doc_id = ingestion_service.ingest_uploaded_file(file)
            with get_db() as db:
                cursor = db.cursor()
                cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
                row = cursor.fetchone()
                if row:
                    uploaded_docs.append(DocumentResponse(
                        id=row["id"],
                        filename=row["filename"],
                        file_type=row["file_type"],
                        file_size=row["file_size"],
                        page_count=row["page_count"] or 0,
                        chunk_count=row["chunk_count"] or 0,
                        status=row["status"],
                        error_message=row["error_message"],
                        created_at=str(row["created_at"]),
                        updated_at=str(row["updated_at"]),
                        metadata=json.loads(row["metadata_json"]) if row["metadata_json"] else None
                    ))
        except Exception as e:
            errors.append({"filename": file.filename or "unknown", "error": str(e)})

    return DocumentBatchUploadResponse(uploaded=uploaded_docs, errors=errors)

@router.get("", response_model=List[DocumentResponse])
def list_documents():
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [
            DocumentResponse(
                id=r["id"],
                filename=r["filename"],
                file_type=r["file_type"],
                file_size=r["file_size"],
                page_count=r["page_count"] or 0,
                chunk_count=r["chunk_count"] or 0,
                status=r["status"],
                error_message=r["error_message"],
                created_at=str(r["created_at"]),
                updated_at=str(r["updated_at"]),
                metadata=json.loads(r["metadata_json"]) if r["metadata_json"] else None
            )
            for r in rows
        ]

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(document_id: str):
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        doc_row = cursor.fetchone()
        if not doc_row:
            raise HTTPException(status_code=404, detail="Document not found")

        cursor.execute("SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC", (document_id,))
        page_rows = cursor.fetchall()

        cursor.execute("SELECT * FROM document_chunks WHERE document_id = ? ORDER BY page_number ASC, chunk_index ASC", (document_id,))
        chunk_rows = cursor.fetchall()

    pages = [
        DocumentPageResponse(
            id=p["id"],
            document_id=p["document_id"],
            page_number=p["page_number"],
            text_content=p["text_content"],
            image_url=f"/api/documents/{document_id}/pages/{p['page_number']}/image" if p["image_path"] else None,
            has_images=bool(p["has_images"]),
            has_tables=bool(p["has_tables"]),
            metadata=json.loads(p["metadata_json"]) if p["metadata_json"] else None
        )
        for p in page_rows
    ]

    chunks = [
        DocumentChunkResponse(
            id=c["id"],
            document_id=c["document_id"],
            page_number=c["page_number"],
            chunk_index=c["chunk_index"],
            content_type=c["content_type"],
            text_content=c["text_content"],
            token_count=c["token_count"] or 0
        )
        for c in chunk_rows
    ]

    return DocumentDetailResponse(
        id=doc_row["id"],
        filename=doc_row["filename"],
        file_type=doc_row["file_type"],
        file_size=doc_row["file_size"],
        page_count=doc_row["page_count"] or 0,
        chunk_count=doc_row["chunk_count"] or 0,
        status=doc_row["status"],
        error_message=doc_row["error_message"],
        created_at=str(doc_row["created_at"]),
        updated_at=str(doc_row["updated_at"]),
        metadata=json.loads(doc_row["metadata_json"]) if doc_row["metadata_json"] else None,
        pages=pages,
        chunks=chunks
    )

@router.get("/{document_id}/pages/{page_number}")
def get_page_info(document_id: str, page_number: int):
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM document_pages WHERE document_id = ? AND page_number = ?",
            (document_id, page_number)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Page not found")

        return {
            "id": row["id"],
            "document_id": row["document_id"],
            "page_number": row["page_number"],
            "text_content": row["text_content"],
            "image_url": f"/api/documents/{document_id}/pages/{page_number}/image" if row["image_path"] else None,
            "has_images": bool(row["has_images"]),
            "has_tables": bool(row["has_tables"])
        }

@router.get("/{document_id}/pages/{page_number}/image")
def get_page_image(document_id: str, page_number: int):
    """Serve the rendered PNG page image for viewer and citations."""
    image_path = settings.PAGES_DIR / f"{document_id}_p{page_number}.png"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Page image not found")
    return FileResponse(image_path, media_type="image/png")

@router.delete("/{document_id}")
def delete_document(document_id: str):
    get_ingestion_service().delete_document(document_id)
    return {"message": f"Document {document_id} and associated embeddings deleted successfully"}

@router.post("/{document_id}/reprocess")
def reprocess_document(document_id: str):
    try:
        get_ingestion_service().reprocess_document(document_id)
        return {"message": "Document reprocessed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reprocessing failed: {str(e)}")
