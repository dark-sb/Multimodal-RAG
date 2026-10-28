import React from 'react';
import {
  LayoutDashboard,
  Files,
  Eye,
  MessageSquareCode,
  Sliders,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Pipeline Overview & Stats' },
    { id: 'documents', label: 'Documents', icon: Files, desc: 'Ingestion & File Management' },
    { id: 'viewer', label: 'Document Viewer', icon: Eye, desc: 'Page & Visual Inspector' },
    { id: 'chat', label: 'AI Chat Workspace', icon: MessageSquareCode, desc: 'Multimodal Q&A & Citations' },
    { id: 'settings', label: 'System & Health', icon: Sliders, desc: 'Providers & Environment' },
    { id: 'about', label: 'Seminar Overview', icon: BookOpen, desc: 'Architecture & Report Notes' },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 font-semibold shadow-sm border border-sky-200/60 dark:border-sky-800/60'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  <div className="flex-1 truncate">
                    <div className="text-xs leading-none">{item.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Seminar Project
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Multimodal Retrieval-Augmented Generation for College Presentation & Evaluation.
          </p>
        </div>
      </div>
    </aside>
  );
};
