import React, { useEffect, useState } from 'react';
import { Sun, Moon, Database, ShieldCheck, Upload, Activity } from 'lucide-react';
import { api } from '../services/api';

import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onOpenUpload: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, activeTab }) => {
  const { isDark, toggleTheme } = useTheme();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [chunkCount, setChunkCount] = useState<number>(0);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealthy(h.status === 'healthy');
        const st = await api.getSystemStatus();
        setChunkCount(st.total_indexed_chunks);
      } catch {
        setHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Multimodal RAG Studio
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                v1.0 AI Intelligence
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal hidden sm:block">
              Evidence-Grounded Document AI & Retrieval Pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <span className={`w-2 h-2 rounded-full ${healthy === true ? 'bg-emerald-500 animate-pulse' : healthy === false ? 'bg-rose-500' : 'bg-amber-400'}`} />
          <span className="text-slate-700 dark:text-slate-300">
            {healthy === true ? 'Backend Online' : healthy === false ? 'Backend Offline' : 'Connecting...'}
          </span>
        </div>

        {/* ChromaDB Chunks Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
          <Database className="w-3.5 h-3.5 text-sky-500" />
          <span>{chunkCount} Chunks Indexed</span>
        </div>

        {/* Quick Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Document</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex items-center gap-1.5 p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
          <span className="text-[11px] font-medium hidden sm:inline text-slate-600 dark:text-slate-300">
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>
      </div>
    </header>
  );
};
