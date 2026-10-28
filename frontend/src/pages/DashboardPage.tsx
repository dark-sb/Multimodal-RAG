import React, { useEffect, useState } from 'react';
import {
  Files,
  CheckCircle2,
  Clock,
  AlertOctagon,
  FileText,
  Database,
  ArrowRight,
  MessageSquare,
  Eye,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';

interface DashboardPageProps {
  onOpenUpload: () => void;
  onNavigateToViewer: (docId: string, pageNum?: number) => void;
  onNavigateToChat: (docId?: string) => void;
  onNavigateToDocuments: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenUpload,
  onNavigateToViewer,
  onNavigateToChat,
  onNavigateToDocuments,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Documents',
      value: stats?.total_documents ?? 0,
      icon: Files,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-900',
    },
    {
      title: 'Successfully Processed',
      value: stats?.completed_documents ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: 'Currently Processing',
      value: stats?.processing_documents ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Failed Ingestions',
      value: stats?.failed_documents ?? 0,
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900',
    },
    {
      title: 'Indexed Pages',
      value: stats?.total_pages ?? 0,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900',
    },
    {
      title: 'ChromaDB Chunks',
      value: stats?.total_chunks ?? 0,
      icon: Database,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900',
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Multimodal Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline ingestion metrics, persistent vector indexing, and active documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Real Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {loading ? '...' : card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Sections: Recent Documents and Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Files className="w-4 h-4 text-sky-600" />
              Recently Ingested Documents
            </h2>
            <button
              onClick={onNavigateToDocuments}
              className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.recent_documents && stats.recent_documents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recent_documents.map((doc) => (
                <div
                  key={doc.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] uppercase text-sky-600 dark:text-sky-400 shrink-0">
                      {doc.file_type}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {doc.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {doc.page_count} pages • {doc.chunk_count} chunks • {(doc.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        doc.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : doc.status === 'processing'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {doc.status}
                    </span>

                    <button
                      onClick={() => onNavigateToViewer(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Inspect Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigateToChat(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                      title="Chat with Document"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              No documents uploaded yet. Click "Upload Document" to begin ingestion.
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-600" />
              Recent AI Conversations
            </h2>
            <button
              onClick={() => onNavigateToChat()}
              className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
            >
              New Chat
            </button>
          </div>

          {stats?.recent_conversations && stats.recent_conversations.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recent_conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onNavigateToChat(undefined)}
                  className="w-full text-left py-3 flex items-start gap-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-2 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="truncate flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {conv.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              No conversations yet. Start a chat to query documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
