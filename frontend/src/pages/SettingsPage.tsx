import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Layers,
  Lock,
  RefreshCw,
  Server,
  FileCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus } from '../types';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (err: any) {
      showToast('Failed to load system status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Configuration & Status
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active model providers, vector database persistence, OCR availability, and privacy settings.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generative & Embedding AI Providers */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            Active AI & Generative Providers
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Generative LLM Engine</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{status?.active_llm_provider || 'Local Grounded Synthesis Engine'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Active
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Embedding Provider</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{status?.active_embedding_provider || 'Local Semantic Hashing Vectorizer'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Active
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <span className="text-slate-400 text-[11px]">Cloud API Configuration Status</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Google Gemini API</span>
                {status?.gemini_configured ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    Not Set (Local Engine in Use)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">OpenAI API</span>
                {status?.openai_configured ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    Not Set (Local Engine in Use)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vector DB & Ingestion Engines */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            Vector Storage & Extraction Engines
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Vector Database (ChromaDB)</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Chroma Persistent Store</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {status?.total_indexed_chunks || 0} Chunks
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">PDF Parsing & Rendering Engine</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>PyMuPDF (fitz) Direct Engine</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">OCR Engine for Scanned Documents</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{status?.ocr_engine || 'Direct Page Extraction'}</span>
                <span className="text-slate-400">
                  {status?.ocr_available ? 'OCR Binary Present' : 'PyMuPDF Native Text Parser'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Limits and Privacy Safeguards */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            Privacy, Storage Isolation & Security Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Max File Upload Size</span>
              <div className="font-bold text-slate-900 dark:text-white">{status?.max_file_size_mb || 50} MB</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Allowed Document Types</span>
              <div className="font-bold text-slate-900 dark:text-white font-mono uppercase text-[11px]">
                {status?.allowed_extensions.join(', ') || 'PDF, DOCX, TXT, PNG, JPG'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-slate-400 text-[11px]">Total Stored Documents</span>
              <div className="font-bold text-slate-900 dark:text-white">{status?.total_stored_documents || 0} Files</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Security Safeguards:</strong> Uploaded user documents and rendered page images are isolated in a private backend storage directory. Files are never publicly exposed or served without sanitization. Deleting a document completely removes all SQLite records, file assets, and ChromaDB vector embeddings.
          </p>
        </div>
      </div>
    </div>
  );
};
