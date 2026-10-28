import React from 'react';
import { BookOpen, GraduationCap, Award, Cpu, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface AboutSeminarPageProps {
  onNavigateToDashboard: () => void;
}

export const AboutSeminarPage: React.FC<AboutSeminarPageProps> = ({
  onNavigateToDashboard,
}) => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <GraduationCap className="w-4 h-4" />
          Academic Seminar Report & Engineering Implementation
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Multimodal Retrieval-Augmented Generation (Multimodal RAG)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Document Intelligence System based on the seminar study of multimodal embeddings, visual document parsing, and grounded context synthesis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            1. Problem Statement in Academic RAG
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Standard text-only RAG pipelines extract flat text from PDF documents while stripping away layout, font hierarchy, tables, diagrams, and figures. As a consequence, questions regarding financial balance sheets, architectural diagrams, statistical charts, or flowchart logic fail catastrophically or cause generative models to hallucinate answers.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            2. The Multimodal Paradigm Solution
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Multimodal RAG couples text representations with visual representations: page renders, tables converted to structured markdown, and vector chunk embeddings linked back to physical page numbers. When an answer is synthesized, each factual statement points to an authentic page excerpt and visual preview.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Architectural Comparison: Traditional Text RAG vs. Multimodal RAG Studio
        </h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3">Feature Dimension</th>
                <th className="p-3">Traditional Text-Only RAG</th>
                <th className="p-3 text-sky-600 dark:text-sky-400">Multimodal RAG Studio (This Project)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="p-3 font-semibold">Document Ingestion</td>
                <td className="p-3">Plain text extraction (tables and charts lost)</td>
                <td className="p-3 text-sky-600 dark:text-sky-400 font-medium">Page-by-page rendering + table matrix preservation + OCR</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Evidence Inspection</td>
                <td className="p-3">Isolated raw text strings without origin</td>
                <td className="p-3 text-sky-600 dark:text-sky-400 font-medium">Direct link to 150-DPI rendered page in Document Viewer</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Hallucination Mitigation</td>
                <td className="p-3">None (relies purely on generic prompt)</td>
                <td className="p-3 text-sky-600 dark:text-sky-400 font-medium">Two-tier citation validator & negative boundary rejection</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Offline Demonstration</td>
                <td className="p-3">Breaks if external API key is invalid</td>
                <td className="p-3 text-sky-600 dark:text-sky-400 font-medium">Built-in deterministic local grounded engine guarantees 100% uptime</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onNavigateToDashboard}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20"
        >
          <span>Launch Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
