import {
  DocumentItem,
  DocumentDetail,
  DocumentPage,
  DashboardStats,
  ChatMessage,
  Conversation,
  BenchmarkItem,
  BenchmarkReport,
  SystemStatus,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Use status text fallback
      errorDetail = response.statusText || errorDetail;
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export const api = {
  // Health & System
  async getHealth(): Promise<{ status: string; service: string; version: string }> {
    return request('/health');
  },

  async getSystemStatus(): Promise<SystemStatus> {
    return request('/settings/status');
  },

  // Dashboard & Documents
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/documents/dashboard');
  },

  async getDocuments(): Promise<DocumentItem[]> {
    return request('/documents');
  },

  async getDocumentDetails(documentId: string): Promise<DocumentDetail> {
    return request(`/documents/${documentId}`);
  },

  async getPageInfo(documentId: string, pageNumber: number): Promise<DocumentPage> {
    return request(`/documents/${documentId}/pages/${pageNumber}`);
  },

  async uploadDocuments(files: File[]): Promise<{ uploaded: DocumentItem[]; errors: { filename: string; error: string }[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(err.detail || 'Upload failed', response.status);
    }

    return response.json();
  },

  async deleteDocument(documentId: string): Promise<{ message: string }> {
    return request(`/documents/${documentId}`, { method: 'DELETE' });
  },

  async reprocessDocument(documentId: string): Promise<{ message: string }> {
    return request(`/documents/${documentId}/reprocess`, { method: 'POST' });
  },

  // Chat & Q&A
  async sendChatMessage(payload: {
    question: string;
    conversation_id?: string;
    selected_document_ids?: string[];
    mode?: string;
  }): Promise<{
    conversation_id: string;
    message_id: string;
    question: string;
    answer: string;
    citations: any[];
    retrieval_latency_ms: number;
    generation_latency_ms: number;
    grounding_status: string;
    created_at: string;
  }> {
    return request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getConversations(): Promise<Conversation[]> {
    return request('/conversations');
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    return request(`/conversations/${conversationId}`);
  },

  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    return request(`/conversations/${conversationId}`, { method: 'DELETE' });
  },

  // Evaluation & Benchmark
  async runEvaluation(payload: {
    query: string;
    target_document_id?: string;
    expected_answer_keywords?: string;
  }): Promise<BenchmarkItem> {
    return request('/evaluation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async runEvaluationSuite(): Promise<BenchmarkReport> {
    return request('/evaluation/run-suite', { method: 'POST' });
  },

  async getEvaluationReport(): Promise<BenchmarkReport> {
    return request('/evaluation/report');
  },
};
