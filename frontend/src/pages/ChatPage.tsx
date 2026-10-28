import React, { useEffect, useState, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  Table as TableIcon,
  Bot,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, Conversation, ChatMessage, CitationEvidence } from '../types';
import { useToast } from '../context/ToastContext';

interface ChatPageProps {
  initialDocId?: string;
  onNavigateToViewer: (docId: string, pageNum?: number) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ initialDocId, onNavigateToViewer }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(initialDocId ? [initialDocId] : []);
  const [isAllDocs, setIsAllDocs] = useState<boolean>(!initialDocId);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeMode, setActiveMode] = useState<string>('general');
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeCitations, setActiveCitations] = useState<CitationEvidence[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Load documents and conversation history
  useEffect(() => {
    const initData = async () => {
      try {
        const [docs, convs] = await Promise.all([api.getDocuments(), api.getConversations()]);
        setDocuments(docs);
        setConversations(convs);

        if (initialDocId) {
          setSelectedDocIds([initialDocId]);
          setIsAllDocs(false);
        }
      } catch (err: any) {
        showToast('Failed to initialize chat workspace', 'error');
      }
    };
    initData();
  }, [initialDocId]);

  // Load conversation messages when currentConvId changes
  useEffect(() => {
    if (!currentConvId) {
      setMessages([]);
      setActiveCitations([]);
      return;
    }

    const loadConv = async () => {
      try {
        const conv = await api.getConversation(currentConvId);
        setMessages(conv.messages || []);
        if (conv.messages && conv.messages.length > 0) {
          const lastAsst = [...conv.messages].reverse().find((m) => m.role === 'assistant');
          if (lastAsst && lastAsst.citations) {
            setActiveCitations(lastAsst.citations);
          }
        }
      } catch (err: any) {
        showToast('Failed to load conversation history', 'error');
      }
    };
    loadConv();
  }, [currentConvId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setActiveCitations([]);
    setInputQuestion('');
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConvId === convId) {
        handleStartNewChat();
      }
      showToast('Conversation deleted', 'info');
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  };

  const handleToggleDoc = (docId: string) => {
    setIsAllDocs(false);
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isSending) return;

    if (documents.length === 0) {
      showToast('Please upload at least one document first.', 'warning');
      return;
    }

    const scope = isAllDocs ? undefined : selectedDocIds.length > 0 ? selectedDocIds : undefined;

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      conversation_id: currentConvId || '',
      role: 'user',
      content: query,
      citations: [],
      retrieval_latency_ms: 0,
      generation_latency_ms: 0,
      grounding_status: 'grounded',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuestion('');
    setIsSending(true);

    try {
      const response = await api.sendChatMessage({
        question: query,
        conversation_id: currentConvId || undefined,
        selected_document_ids: scope,
        mode: activeMode,
      });

      setCurrentConvId(response.conversation_id);

      const asstMsg: ChatMessage = {
        id: response.message_id,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        retrieval_latency_ms: response.retrieval_latency_ms,
        generation_latency_ms: response.generation_latency_ms,
        grounding_status: response.grounding_status as any,
        created_at: response.created_at,
      };

      setMessages((prev) => [...prev, asstMsg]);
      setActiveCitations(response.citations);

      // Refresh conversations list to update title
      const updatedConvs = await api.getConversations();
      setConversations(updatedConvs);
    } catch (err: any) {
      showToast(err.message || 'Chat query failed', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    showToast('Answer copied to clipboard!', 'success');
    setTimeout(() => setCopiedMsgId(null), 2500);
  };

  const queryModes = [
    { id: 'general', label: 'General Q&A', promptPrefix: '' },
    { id: 'summarize', label: 'Summarize Document', promptPrefix: 'Please provide a comprehensive summary of key findings in this document.' },
    { id: 'extract_facts', label: 'Extract Specific Facts', promptPrefix: 'What are the specific quantitative values, dates, and metrics mentioned in the text?' },
    { id: 'compare', label: 'Compare Documents', promptPrefix: 'Compare and contrast the findings and methodologies across the selected documents.' },
    { id: 'visual', label: 'Tables & Visuals', promptPrefix: 'Analyze the tables, charts, and visual figures in the document and explain their data.' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Sidebar: Scope & Conversations */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {/* Document Knowledge Source Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Knowledge Scope
              </span>
              <button
                onClick={() => {
                  setIsAllDocs(true);
                  setSelectedDocIds([]);
                }}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isAllDocs
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                All Documents
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1">
              {documents.map((doc) => {
                const isChecked = !isAllDocs && selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleDoc(doc.id)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                    />
                    <span className="truncate flex-1 text-[11px] font-medium" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </label>
                );
              })}
              {documents.length === 0 && (
                <div className="text-[11px] text-slate-400 p-2 text-center">
                  No documents indexed.
                </div>
              )}
            </div>
          </div>

          {/* Previous Conversations */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Conversations ({conversations.length})
            </span>
            <div className="space-y-1">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setCurrentConvId(c.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    currentConvId === c.id
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center Chat Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Chat Scope Status Banner */}
        <div className="h-10 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 px-6 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-sky-500" />
            <span>
              Active Scope:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {isAllDocs
                  ? 'All Indexed Documents'
                  : selectedDocIds.length > 0
                  ? `${selectedDocIds.length} Document(s) Selected`
                  : 'All Documents (Default)'}
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            Strict Evidence Grounding Active
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-12">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multimodal RAG Intelligence Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Ask factual questions, compare multiple files, or request data from diagrams and tables. Answers are strictly grounded in retrieved evidence.
                </p>
              </div>

              {/* Preset Query Mode Buttons */}
              <div className="w-full flex flex-col gap-2 pt-2">
                {queryModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMode(m.id);
                      if (m.promptPrefix) {
                        setInputQuestion(m.promptPrefix);
                      }
                    }}
                    className="p-2.5 rounded-xl text-left text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 text-slate-700 dark:text-slate-300 font-medium shadow-sm transition-all"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{m.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{m.promptPrefix || 'Ask any freeform question.'}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAsst = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${isAsst ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isAsst
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {isAsst ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2 max-w-2xl">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isAsst
                          ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                          : 'bg-sky-600 text-white font-medium shadow-md shadow-sky-600/10'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Assistant footer with Citations button and Latency badges */}
                      {isAsst && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                                msg.grounding_status === 'grounded'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : msg.grounding_status === 'insufficient_evidence'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {msg.grounding_status === 'grounded' ? 'Verified Grounded' : msg.grounding_status}
                            </span>

                            {msg.retrieval_latency_ms > 0 && (
                              <span className="text-slate-400 font-mono">
                                Retrieval: {msg.retrieval_latency_ms}ms
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {msg.citations && msg.citations.length > 0 && (
                              <button
                                onClick={() => setActiveCitations(msg.citations)}
                                className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-1"
                              >
                                <span>{msg.citations.length} Supporting Citations</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="Copy Answer"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-center gap-3 text-xs text-slate-400 max-w-md animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                Retrieving multimodal passages and synthesizing grounded response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a question about the uploaded documents, diagrams, or tables..."
              disabled={isSending}
              className="flex-1 px-4 py-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isSending}
              className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar: Evidence and Citations Panel */}
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 overflow-y-auto space-y-4 shrink-0 hidden lg:block">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Verified Evidence Citations
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {activeCitations.length} sources
          </span>
        </div>

        {activeCitations.length > 0 ? (
          <div className="space-y-3">
            {activeCitations.map((cit, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white truncate" title={cit.document_name}>
                    {cit.document_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-mono text-[10px] font-bold">
                    Page {cit.page_number}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{cit.content_type} chunk</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    Relevance: {(cit.relevance_score * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Excerpt */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  "{cit.excerpt.slice(0, 180)}..."
                </p>

                {/* Page Preview Thumbnail if available */}
                {cit.image_url && (
                  <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                    <img
                      src={cit.image_url}
                      alt={`Page ${cit.page_number} evidence`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Button to jump into Document Viewer */}
                <button
                  onClick={() => onNavigateToViewer(cit.document_id, cit.page_number)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  <span>Open Page in Viewer</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Layers className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
            <p>No citations for current message.</p>
            <p className="text-[11px]">Supporting evidence will appear here after asking a question.</p>
          </div>
        )}
      </div>
    </div>
  );
};
