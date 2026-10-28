import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentViewerPage } from './pages/DocumentViewerPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { AboutSeminarPage } from './pages/AboutSeminarPage';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [viewerDocId, setViewerDocId] = useState<string | undefined>(undefined);
  const [viewerPageNum, setViewerPageNum] = useState<number>(1);
  const [chatInitialDocId, setChatInitialDocId] = useState<string | undefined>(undefined);
  const { isDark } = useTheme();

  const handleNavigateToViewer = (docId: string, pageNum: number = 1) => {
    setViewerDocId(docId);
    setViewerPageNum(pageNum);
    setActiveTab('viewer');
  };

  const handleNavigateToChat = (docId?: string) => {
    setChatInitialDocId(docId);
    setActiveTab('chat');
  };

  // Safe fallback if user state ever contains 'evaluation'
  const currentTab = activeTab === 'evaluation' ? 'dashboard' : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        activeTab={currentTab}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateToViewer={handleNavigateToViewer}
              onNavigateToChat={handleNavigateToChat}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsPage
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateToViewer={handleNavigateToViewer}
              onNavigateToChat={handleNavigateToChat}
            />
          )}

          {currentTab === 'viewer' && (
            <DocumentViewerPage
              selectedDocId={viewerDocId}
              initialPageNumber={viewerPageNum}
              onNavigateToChat={handleNavigateToChat}
            />
          )}

          {currentTab === 'chat' && (
            <ChatPage
              initialDocId={chatInitialDocId}
              onNavigateToViewer={handleNavigateToViewer}
            />
          )}

          {currentTab === 'settings' && <SettingsPage />}

          {currentTab === 'about' && (
            <AboutSeminarPage
              onNavigateToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {currentTab === 'landing' && (
            <LandingPage
              onGetStarted={() => setActiveTab('dashboard')}
              onOpenViewer={() => setActiveTab('viewer')}
              onOpenChat={() => setActiveTab('chat')}
            />
          )}
        </main>
      </div>

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          // Triggers re-renders / data refresh
          setActiveTab((prev) => prev);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
