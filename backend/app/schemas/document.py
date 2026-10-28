from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DocumentPageResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    text_content: Optional[str] = ""
    image_url: Optional[str] = None
    has_images: bool = False
    has_tables: bool = False
    metadata: Optional[Dict[str, Any]] = None

class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    chunk_index: int
    content_type: str
    text_content: str
    token_count: int

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None

class DocumentDetailResponse(DocumentResponse):
    pages: List[DocumentPageResponse] = []
    chunks: List[DocumentChunkResponse] = []

class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentResponse

class DocumentBatchUploadResponse(BaseModel):
    uploaded: List[DocumentResponse]
    errors: List[Dict[str, str]] = []

class DashboardStatsResponse(BaseModel):
    total_documents: int
    completed_documents: int
    processing_documents: int
    failed_documents: int
    total_pages: int
    total_chunks: int
    recent_documents: List[DocumentResponse]
    recent_conversations: List[Dict[str, Any]]
