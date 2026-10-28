export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  chunk_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any> | null;
}

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  text_content?: string;
  image_url?: string;
  has_images: boolean;
  has_tables: boolean;
  metadata?: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  content_type: string;
  text_content: string;
  token_count: number;
}

export interface DocumentDetail extends DocumentItem {
  pages: DocumentPage[];
  chunks: DocumentChunk[];
}

export interface DashboardStats {
  total_documents: number;
  completed_documents: number;
  processing_documents: number;
  failed_documents: number;
  total_pages: number;
  total_chunks: number;
  recent_documents: DocumentItem[];
  recent_conversations: { id: string; title: string; updated_at: string }[];
}

export interface CitationEvidence {
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_index: number;
  content_type: string;
  excerpt: string;
  relevance_score: number;
  image_url?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationEvidence[];
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  grounding_status: 'grounded' | 'partially_grounded' | 'insufficient_evidence';
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  selected_docs: string[];
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  message_count?: number;
}

export interface BenchmarkItem {
  id: string;
  query: string;
  target_document?: string;
  expected_answer_keywords?: string;
  retrieved_chunks_count: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  citation_validity: boolean;
  faithfulness_score: number;
  status: 'passed' | 'failed' | 'warning';
  notes?: string;
  created_at: string;
}

export interface BenchmarkReport {
  total_evaluations: number;
  passed_count: number;
  failed_count: number;
  avg_retrieval_latency_ms: number;
  avg_generation_latency_ms: number;
  citation_precision_rate: number;
  recent_runs: BenchmarkItem[];
}

export interface SystemStatus {
  status: string;
  version: string;
  ocr_available: boolean;
  ocr_engine: string;
  pymupdf_available: boolean;
  chromadb_available: boolean;
  active_llm_provider: string;
  active_embedding_provider: string;
  gemini_configured: boolean;
  openai_configured: boolean;
  max_file_size_mb: number;
  allowed_extensions: string[];
  storage_path: string;
  database_path: string;
  total_indexed_chunks: number;
  total_stored_documents: number;
}
