import os
import uuid
import json
from pathlib import Path
from typing import Dict, Any, Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from app.database.connection import get_db
from app.services.ingestion.pdf_extractor import extract_pdf_content
from app.services.ingestion.docx_extractor import extract_docx_content
from app.services.ingestion.image_extractor import extract_image_content, extract_txt_content
from app.services.ingestion.chunker import chunk_text, chunk_narrative, chunk_table
from app.services.retrieval.vector_store import get_vector_store

def sanitize_filename(filename: str) -> str:
    """Sanitize file name to prevent directory traversal and invalid characters."""
    clean = Path(filename).name
    # Remove any suspicious shell characters
    clean = "".join(c for c in clean if c.isalnum() or c in "._- ")
    return clean or "document"

class DocumentIngestionService:
    def __init__(self):
        self.vector_store = get_vector_store()

    def ingest_uploaded_file(self, file: UploadFile) -> str:
        """
        Validate file, save to secure storage, create database record, and process asynchronously or synchronously.
        Returns: document_id
        """
        filename = sanitize_filename(file.filename or "upload.pdf")
        extension = filename.split(".")[-1].lower() if "." in filename else ""

        if extension not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '.{extension}'. Supported: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        document_id = str(uuid.uuid4())
        dest_filename = f"{document_id}_{filename}"
        dest_path = settings.STORAGE_DIR / dest_filename

        # Write file content
        file_size = 0
        with open(dest_path, "wb") as f:
            while chunk := file.file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size limit of {settings.MAX_FILE_SIZE_MB}MB"
                    )
                f.write(chunk)

        # Create database record
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO documents (id, filename, file_path, file_type, file_size, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
                """,
                (document_id, filename, str(dest_path), extension, file_size)
            )

        # Process document
        self.process_document(document_id)
        return document_id

    def process_document(self, document_id: str):
        """
        Extract content, chunk text, persist pages and chunks, and index into ChromaDB.
        """
        # Fetch document from DB
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
            doc_row = cursor.fetchone()
            if not doc_row:
                return

            cursor.execute("UPDATE documents SET status = 'processing', error_message = NULL WHERE id = ?", (document_id,))

        dest_path = Path(doc_row["file_path"])
        extension = doc_row["file_type"]

        try:
            # 1. Extraction by file type
            if extension == "pdf":
                pages_data, doc_meta = extract_pdf_content(dest_path, document_id)
            elif extension == "docx":
                pages_data, doc_meta = extract_docx_content(dest_path, document_id)
            elif extension in ("png", "jpg", "jpeg"):
                pages_data, doc_meta = extract_image_content(dest_path, document_id)
            elif extension == "txt":
                pages_data, doc_meta = extract_txt_content(dest_path, document_id)
            else:
                raise ValueError(f"Unknown extension {extension}")

            # 2. Chunking
            all_chunks = []
            chunk_global_idx = 0
            if extension == "pdf":
                for p in pages_data:
                    p_num = p["page_number"]
                    s_title = p.get("section_title", "")
                    is_eval = p.get("is_evaluation_section", False)

                    # 2a. Chunk narrative blocks
                    narrative_blocks = p.get("narrative_blocks", [])
                    if narrative_blocks:
                        n_chunks = chunk_narrative(
                            paragraphs=narrative_blocks,
                            document_id=document_id,
                            page_number=p_num,
                            section_title=s_title,
                            is_evaluation=is_eval,
                            chunk_size=settings.CHUNK_SIZE,
                            overlap=settings.CHUNK_OVERLAP,
                            start_chunk_idx=chunk_global_idx
                        )
                        chunk_global_idx += len(n_chunks)
                        all_chunks.extend(n_chunks)

                    # 2b. Chunk structured tables
                    for t_data in p.get("tables_structured", []):
                        t_chunks = chunk_table(
                            table_data=t_data,
                            document_id=document_id,
                            page_number=p_num,
                            section_title=s_title,
                            start_chunk_idx=chunk_global_idx
                        )
                        chunk_global_idx += len(t_chunks)
                        all_chunks.extend(t_chunks)

                    # 2c. Fallback if page has neither narrative blocks nor structured tables
                    if not narrative_blocks and not p.get("tables_structured"):
                        p_chunks = chunk_text(
                            text=p["text_content"],
                            document_id=document_id,
                            page_number=p_num,
                            chunk_size=settings.CHUNK_SIZE,
                            overlap=settings.CHUNK_OVERLAP,
                            content_type="text",
                            start_chunk_idx=chunk_global_idx
                        )
                        chunk_global_idx += len(p_chunks)
                        all_chunks.extend(p_chunks)
            else:
                for p in pages_data:
                    p_text = p["text_content"]
                    p_num = p["page_number"]
                    p_chunks = chunk_text(
                        text=p_text,
                        document_id=document_id,
                        page_number=p_num,
                        chunk_size=settings.CHUNK_SIZE,
                        overlap=settings.CHUNK_OVERLAP,
                        content_type="table" if p.get("has_tables") else "text",
                        start_chunk_idx=chunk_global_idx
                    )
                    chunk_global_idx += len(p_chunks)
                    all_chunks.extend(p_chunks)

            # 3. Persist pages & chunks to SQLite
            with get_db() as db:
                cursor = db.cursor()
                # Clear any existing pages/chunks for idempotency
                cursor.execute("DELETE FROM document_pages WHERE document_id = ?", (document_id,))
                cursor.execute("DELETE FROM document_chunks WHERE document_id = ?", (document_id,))

                for p in pages_data:
                    cursor.execute(
                        """
                        INSERT INTO document_pages (id, document_id, page_number, text_content, image_path, has_images, has_tables, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            p["id"],
                            document_id,
                            p["page_number"],
                            p["text_content"],
                            p.get("image_path"),
                            1 if p.get("has_images") else 0,
                            1 if p.get("has_tables") else 0,
                            json.dumps(p.get("metadata_json", {}))
                        )
                    )

                for c in all_chunks:
                    meta_raw = c.get("metadata_json", {})
                    meta_str = json.dumps(meta_raw) if isinstance(meta_raw, dict) else str(meta_raw or "{}")
                    cursor.execute(
                        """
                        INSERT INTO document_chunks (id, document_id, page_number, chunk_index, content_type, text_content, token_count, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            c["id"],
                            document_id,
                            c["page_number"],
                            c["chunk_index"],
                            c["content_type"],
                            c["text_content"],
                            c["token_count"],
                            meta_str
                        )
                    )

                # 4. Update document completion status
                cursor.execute(
                    """
                    UPDATE documents
                    SET status = 'completed',
                        page_count = ?,
                        chunk_count = ?,
                        metadata_json = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (len(pages_data), len(all_chunks), json.dumps(doc_meta), document_id)
                )

            # 5. Index chunks into ChromaDB
            self.vector_store.delete_document_chunks(document_id)
            self.vector_store.add_chunks(all_chunks)

        except Exception as e:
            with get_db() as db:
                cursor = db.cursor()
                cursor.execute(
                    """
                    UPDATE documents
                    SET status = 'failed',
                        error_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (str(e), document_id)
                )
            raise

    def delete_document(self, document_id: str):
        """Delete document from database, filesystem, and vector index."""
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT file_path FROM documents WHERE id = ?", (document_id,))
            row = cursor.fetchone()
            if row and row["file_path"]:
                try:
                    Path(row["file_path"]).unlink(missing_ok=True)
                except Exception:
                    pass

            # Cascade delete in DB
            cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))

        # Remove chunks from ChromaDB
        self.vector_store.delete_document_chunks(document_id)

        # Remove page images from PAGES_DIR
        for p_img in settings.PAGES_DIR.glob(f"{document_id}_p*.png"):
            p_img.unlink(missing_ok=True)

    def reprocess_document(self, document_id: str):
        """Retry processing a failed or existing document."""
        self.process_document(document_id)

_ingestion_service_instance = None

def get_ingestion_service() -> DocumentIngestionService:
    global _ingestion_service_instance
    if _ingestion_service_instance is None:
        _ingestion_service_instance = DocumentIngestionService()
    return _ingestion_service_instance
