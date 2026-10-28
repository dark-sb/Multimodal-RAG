import React, { useEffect, useState } from 'react';
import {
  Files,
  Search,
  Upload,
  RefreshCw,
  Trash2,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  FileText,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentDetail } from '../types';
import { useToast } from '../context/ToastContext';

interface DocumentsPageProps {
  onOpenUpload: () => void;
  onNavigateToViewer: (docId: string, pageNum?: number) => void;
  onNavigateToChat: (docId: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  onOpenUpload,
  onNavigateToViewer,
  onNavigateToChat,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { showToast } = useToast();

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and its vector embeddings?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      showToast(`Document "${filename}" deleted.`, 'success');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      showToast('Reprocessing document pipeline...', 'info');
      await api.reprocessDocument(docId);
      showToast('Document reprocessed successfully!', 'success');
      loadDocuments();
    } catch (err: any) {
      showToast(err.message || 'Reprocessing failed', 'error');
    }
  };

  const handleInspectDetails = async (docId: string) => {
    try {
      setLoadingDetail(true);
      const details = await api.getDocumentDetails(docId);
      setSelectedDoc(details);
    } catch (err: any) {
      showToast(err.message || 'Failed to load document details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Document Ingestion & Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage uploaded PDFs, DOCX, TXT, and image files. View page extraction and vector chunk statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDocuments}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Status:</span>
          {['all', 'completed', 'processing', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Document Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages / Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {doc.filename}
                    </td>
                    <td className="py-3.5 px-4 uppercase font-bold text-slate-500 font-mono text-[10px]">
                      {doc.file_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                      {doc.page_count} pages • {doc.chunk_count} chunks
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          doc.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : doc.status === 'processing'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleInspectDetails(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Details"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToViewer(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                        title="Open Document Viewer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToChat(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        title="Chat With This Document"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {doc.status === 'failed' && (
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                          title="Retry Ingestion"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Files className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold">No documents found.</p>
            <p className="text-[11px] text-slate-400">Upload PDF, DOCX, TXT, or Image files to start indexing.</p>
          </div>
        )}
      </div>

      {/* Document Details Drawer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {selectedDoc.filename}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {selectedDoc.id} • {selectedDoc.page_count} Pages • {selectedDoc.chunk_count} Chunks
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDoc.error_message && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                <span className="font-bold">Error:</span> {selectedDoc.error_message}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indexed Chunks Breakdown ({selectedDoc.chunks.length})
              </h3>
              <div className="space-y-2">
                {selectedDoc.chunks.slice(0, 15).map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                      <span>Page {chunk.page_number} • Chunk {chunk.chunk_index}</span>
                      <span className="text-slate-400 font-normal">{chunk.token_count} words</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      "{chunk.text_content.slice(0, 240)}..."
                    </p>
                  </div>
                ))}
                {selectedDoc.chunks.length > 15 && (
                  <p className="text-xs text-center text-slate-400">
                    Showing first 15 of {selectedDoc.chunks.length} chunks.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  onNavigateToViewer(selectedDoc.id);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                Open in Full Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
