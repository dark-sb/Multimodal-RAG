import React from 'react';
import {
  FileText,
  Search,
  Sparkles,
  Layers,
  Database,
  ShieldCheck,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Workflow,
  Eye,
  FileSearch,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenViewer: () => void;
  onOpenChat: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onOpenViewer, onOpenChat }) => {
  const pipelineStages = [
    { step: '01', title: 'Document Ingestion', desc: 'Secure upload, MIME validation, format normalization (PDF, DOCX, TXT, Images).' },
    { step: '02', title: 'Multimodal Preprocessing', desc: 'PyMuPDF page rendering, table extraction, OCR detection, and visual element isolation.' },
    { step: '03', title: 'Semantic Chunking', desc: 'Boundary-preserving overlapping chunker linking chunks to page coordinates.' },
    { step: '04', title: 'Embedding Generation', desc: 'Vectorization into 384-dimensional dense semantic space with L2 normalization.' },
    { step: '05', title: 'Vector DB Indexing', desc: 'Persistent ChromaDB vector indexing with document ID metadata scoping.' },
    { step: '06', title: 'Hybrid Retrieval', desc: 'Dense semantic similarity search combined with lexical keyword boosting.' },
    { step: '07', title: 'Context Fusion', desc: 'Merging multimodal text passages, tables, and page visual metadata into prompt structure.' },
    { step: '08', title: 'Grounded Generation', desc: 'Generative model synthesis strictly constrained to cited retrieved evidence.' },
    { step: '09', title: 'Evidence Validation', desc: 'Post-generation validation eliminating unsupported or hallucinated citations.' },
    { step: '10', title: 'Interactive Citations', desc: 'Delivery with clickable page citations linked directly to the deep document viewer.' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Academic Engineering Seminar Project
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
          Multimodal Retrieval-Augmented Generation Studio
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          An end-to-end AI document intelligence platform that extracts text, tabular structures, and page visuals, retrieving verifiable evidence to generate hallucination-free answers.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/25 transition-all"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Search className="w-4 h-4 text-sky-500" />
            <span>Open AI Chat Workspace</span>
          </button>
        </div>
      </div>

      {/* RAG Workflow Visual Diagram */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              End-to-End Multimodal RAG Pipeline Architecture
            </h2>
          </div>
          <span className="text-xs text-slate-500">Seminar Implementation Specification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {pipelineStages.map((st) => (
            <div
              key={st.step}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5 hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
            >
              <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono">
                STAGE {st.step}
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {st.title}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Evidence Demonstration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-sky-500/20 text-sky-300 text-xs font-semibold">
              <FileSearch className="w-3.5 h-3.5" />
              Live Grounded Demonstration
            </div>
            <h3 className="text-xl font-bold">Query: "How does the system eliminate hallucinations?"</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standard LLMs fabricate facts when unfamiliar with domain documents. Multimodal RAG Studio retrieves verified page chunks from ChromaDB, fuses them with strict system constraints, and validates every citation before displaying the answer.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-sky-200">
              <span className="text-emerald-400 font-bold">[VERIFIED CITATION]</span> Page 4, Chunk 2:
              "Generative responses are grounded directly into source excerpts, rejecting out-of-scope queries with explicit insufficient evidence warnings."
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700">
            <span>Retrieval Latency: 12.4ms</span>
            <span className="text-emerald-400 font-semibold">Grounding Status: 100% Grounded</span>
          </div>
        </div>

        {/* Supported Modalities and File Formats */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            Supported Modalities & Extractor Pipeline
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">PDF Documents:</span> Page-by-page text extraction, 150-DPI high-res visual page rendering, table detection, and OCR detection for scanned documents.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">DOCX & Word Files:</span> Paragraph structure preservation, nested table matrix conversion into markdown format.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Visual Images (PNG/JPG):</span> Diagram and chart assets processed with metadata extraction and preview rendering.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">ChromaDB Vector Store:</span> Local persistent embeddings with scoped metadata filtering by document ID.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
