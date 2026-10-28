from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class EvaluationRunRequest(BaseModel):
    query: str
    target_document_id: Optional[str] = None
    expected_answer_keywords: Optional[str] = None

class BenchmarkItem(BaseModel):
    id: str
    query: str
    target_document: Optional[str] = None
    expected_answer_keywords: Optional[str] = None
    retrieved_chunks_count: int
    retrieval_latency_ms: float
    generation_latency_ms: float
    citation_validity: bool
    faithfulness_score: float
    status: str
    notes: Optional[str] = None
    created_at: str

class BenchmarkReport(BaseModel):
    total_evaluations: int
    passed_count: int
    failed_count: int
    avg_retrieval_latency_ms: float
    avg_generation_latency_ms: float
    citation_precision_rate: float
    recent_runs: List[BenchmarkItem] = []
