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

export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000';
export const CLOUD_BACKEND_URL = 'https://multimodal-rag-e371.onrender.com';

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('rag_backend_url');
    if (saved) return saved.replace(/\/+$/, '');

    // If running deployed (e.g. on Vercel), default to the cloud backend on Render
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return (import.meta.env.VITE_BACKEND_URL || CLOUD_BACKEND_URL).replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim();
  return (envUrl || LOCAL_BACKEND_URL).replace(/\/+$/, '');
}

export function setBackendUrl(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rag_backend_url', url.replace(/\/+$/, ''));
  }
}

export function getBackendOrigin(): string {
  return getBackendUrl().replace(/\/api\/?$/, '');
}

export function getApiBase(): string {
  const base = getBackendUrl();
  return base.endsWith('/api') ? base : `${base}/api`;
}

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = getBackendOrigin();
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;
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
  resolveMediaUrl,
  getBackendUrl,
  setBackendUrl,
  LOCAL_BACKEND_URL,
  CLOUD_BACKEND_URL,

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
    const detail = await request<DocumentDetail>(`/documents/${documentId}`);
    if (detail && Array.isArray(detail.pages)) {
      detail.pages = detail.pages.map((p) => ({
        ...p,
        image_url: p.image_url ? resolveMediaUrl(p.image_url) : undefined,
      }));
    }
    return detail;
  },

  async getPageInfo(documentId: string, pageNumber: number): Promise<DocumentPage> {
    const page = await request<DocumentPage>(`/documents/${documentId}/pages/${pageNumber}`);
    if (page && page.image_url) {
      page.image_url = resolveMediaUrl(page.image_url);
    }
    return page;
  },

  async uploadDocuments(files: File[]): Promise<{ uploaded: DocumentItem[]; errors: { filename: string; error: string }[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${getApiBase()}/documents/upload`, {
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
    const res = await request<any>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res && Array.isArray(res.citations)) {
      res.citations = res.citations.map((c: any) => ({
        ...c,
        image_url: c.image_url ? resolveMediaUrl(c.image_url) : undefined,
      }));
    }
    return res;
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
