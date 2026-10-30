import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Image as ImageIcon,
  Table,
  Layers,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentDetail, DocumentPage } from '../types';
import { useToast } from '../context/ToastContext';

interface DocumentViewerPageProps {
  selectedDocId?: string;
  initialPageNumber?: number;
  onNavigateToChat: (docId: string) => void;
}

export const DocumentViewerPage: React.FC<DocumentViewerPageProps> = ({
  selectedDocId,
  initialPageNumber = 1,
  onNavigateToChat,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string>(selectedDocId || '');
  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState<number>(initialPageNumber);
  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'chunks' | 'info'>('preview');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Load document list
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await api.getDocuments();
        setDocuments(docs);
        if (!currentDocId && docs.length > 0) {
          setCurrentDocId(docs[0].id);
        }
      } catch (err: any) {
        showToast('Failed to load documents list', 'error');
      }
    };
    fetchDocs();
  }, []);

  // Update docId or pageNum if prop changes
  useEffect(() => {
    if (selectedDocId && selectedDocId !== currentDocId) {
      setCurrentDocId(selectedDocId);
    }
    if (initialPageNumber) {
      setCurrentPageNum(initialPageNumber);
    }
  }, [selectedDocId, initialPageNumber]);

  // Load selected document details
  useEffect(() => {
    if (!currentDocId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const detail = await api.getDocumentDetails(currentDocId);
        setDocumentDetail(detail);
        if (currentPageNum > detail.page_count && detail.page_count > 0) {
          setCurrentPageNum(1);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load document preview', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [currentDocId]);

  const currentPage = documentDetail?.pages.find((p) => p.page_number === currentPageNum);
  const pageChunks = documentDetail?.chunks.filter((c) => c.page_number === currentPageNum) || [];

  const handlePrevPage = () => {
    if (currentPageNum > 1) setCurrentPageNum((p) => p - 1);
  };

  const handleNextPage = () => {
    if (documentDetail && currentPageNum < documentDetail.page_count) {
      setCurrentPageNum((p) => p + 1);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Controls Toolbar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Document Switcher Dropdown */}
          <select
            value={currentDocId}
            onChange={(e) => {
              setCurrentDocId(e.target.value);
              setCurrentPageNum(1);
            }}
            className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none max-w-xs truncate"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.page_count}p)
              </option>
            ))}
          </select>

          {documentDetail && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={handlePrevPage}
                disabled={currentPageNum <= 1}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                Page {currentPageNum} / {documentDetail.page_count}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPageNum >= documentDetail.page_count}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Visual Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Extracted Text</span>
          </button>
          <button
            onClick={() => setActiveTab('chunks')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === 'chunks'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Page Chunks ({pageChunks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === 'info'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Metadata</span>
          </button>
        </div>

        {/* Zoom & Chat actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono w-10 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => onNavigateToChat(currentDocId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>Ask AI About This Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Thumbnail Bar + Center Inspection Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Page Thumbnails Strip */}
        <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 overflow-y-auto space-y-3 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Pages ({documentDetail?.pages.length || 0})
          </div>
          {documentDetail?.pages.map((p) => {
            const isSelected = p.page_number === currentPageNum;
            return (
              <button
                key={p.id}
                onClick={() => setCurrentPageNum(p.page_number)}
                className={`w-full text-left rounded-xl p-2 border transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-bold ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    Page {p.page_number}
                  </span>
                  <div className="flex items-center gap-1">
                    {p.has_tables && (
                      <span title="Detected Table">
                        <Table className="w-3 h-3 text-indigo-500" />
                      </span>
                    )}
                    {p.has_images && (
                      <span title="Visual Content">
                        <ImageIcon className="w-3 h-3 text-emerald-500" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnail image */}
                <div className="w-full h-28 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                  {p.image_url ? (
                    <img
                      src={api.resolveMediaUrl(p.image_url)}
                      alt={`Thumbnail page ${p.page_number}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Content Inspector */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-20">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
              <span>Rendering Document Page...</span>
            </div>
          ) : !documentDetail ? (
            <div className="text-center py-20 text-xs text-slate-400">
              No document selected. Please choose a document from the top bar.
            </div>
          ) : (
            <>
              {/* Tab 1: Visual Page Preview */}
              {activeTab === 'preview' && (
                <div className="flex justify-center transition-all duration-150">
                  {currentPage?.image_url ? (
                    <div
                      className="shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white"
                      style={{ width: `${(800 * zoomLevel) / 100}px` }}
                    >
                      <img
                        src={api.resolveMediaUrl(currentPage.image_url)}
                        alt={`Page ${currentPageNum}`}
                        className="w-full h-auto block"
                      />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-400">
                      Visual page preview unavailable for this document type.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Extracted Text */}
              {activeTab === 'text' && (
                <div className="max-w-3xl w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" />
                      Page {currentPageNum} Extracted Content
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentPage?.text_content?.length || 0} characters
                    </span>
                  </div>

                  <div className="text-xs leading-relaxed font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal selection:bg-sky-200 dark:selection:bg-sky-900">
                    {currentPage?.text_content || 'No text extracted on this page.'}
                  </div>
                </div>
              )}

              {/* Tab 3: Chunks Breakdown */}
              {activeTab === 'chunks' && (
                <div className="max-w-3xl w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      Semantic Overlapping Chunks for Page {currentPageNum}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Indexed in ChromaDB with page coordinates
                    </span>
                  </div>

                  {pageChunks.length > 0 ? (
                    pageChunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                          <span>
                            Chunk Index {chunk.chunk_index} • Type: {chunk.content_type.toUpperCase()}
                          </span>
                          <span className="text-slate-400">{chunk.token_count} words</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          "{chunk.text_content}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No chunks indexed for this page.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Metadata */}
              {activeTab === 'info' && (
                <div className="max-w-2xl w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Document Processing & Metadata
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Filename</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{documentDetail.filename}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Format</span>
                      <span className="font-mono uppercase font-semibold">{documentDetail.file_type}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Total Pages</span>
                      <span>{documentDetail.page_count} pages</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">ChromaDB Chunks</span>
                      <span className="font-semibold">{documentDetail.chunk_count} vectors</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">File Size</span>
                      <span>{(documentDetail.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Uploaded At</span>
                      <span>{new Date(documentDetail.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
