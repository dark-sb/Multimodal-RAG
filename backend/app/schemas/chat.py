from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CitationEvidence(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    chunk_index: int
    content_type: str  # "text", "table", "image", "caption"
    excerpt: str
    relevance_score: float
    image_url: Optional[str] = None

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User's query")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID")
    selected_document_ids: Optional[List[str]] = Field(None, description="Scope filter: specific doc IDs or None for all")
    mode: Optional[str] = Field("general", description="general, summarize, compare, extract_facts, visual")

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    question: str
    answer: str
    citations: List[CitationEvidence] = []
    retrieval_latency_ms: float = 0.0
    generation_latency_ms: float = 0.0
    grounding_status: str = "grounded"  # "grounded", "partially_grounded", "insufficient_evidence"
    warning: Optional[str] = None
    created_at: str

class MessageItem(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: List[CitationEvidence] = []
    retrieval_latency_ms: float = 0.0
    generation_latency_ms: float = 0.0
    grounding_status: str = "grounded"
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    selected_docs: List[str] = []
    created_at: str
    updated_at: str
    messages: List[MessageItem] = []
