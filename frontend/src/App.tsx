import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { FilesPage } from './pages/FilesPage';
import { EmailsPage } from './pages/EmailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { FilePreviewModal } from './components/files/FilePreviewModal';
import { EmailDetailDrawer } from './components/emails/EmailDetailDrawer';
import { DashboardStats, Attachment, FileCategory } from './types';
import { api } from './api/client';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals & Drawers
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadStats = () => {
    api.getStats()
      .then((res) => setStats(res))
      .catch((err) => console.error('Failed to load stats:', err));
  };

  useEffect(() => {
    loadStats();
    // Refresh stats every 15 seconds
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (view: string, category?: FileCategory) => {
    setCurrentView(view);
    setSelectedCategory(category);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerProcess();
      loadStats();
      if (res.success) {
        showToast(res.message || 'Mailbox sync complete!', 'success');
      } else {
        showToast(res.message || 'Sync encountered errors', 'error');
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulate = async () => {
    try {
      showToast('Generating simulated incoming email with PDF, Image, Word & CSV...', 'info');
      const res = await api.simulateEmail('standard');
      loadStats();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Simulation skipped or failed', 'error');
      }
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message || err}`, 'error');
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'overview':
        return 'Overview';
      case 'files':
        return selectedCategory ? `${selectedCategory} Files` : 'All Files';
      case 'emails':
        return 'Inbox Emails';
      case 'settings':
        return 'Settings & Status';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        selectedCategory={selectedCategory}
        categoryCounts={stats?.categories}
        isSyncing={isSyncing}
        onSync={handleSync}
        onSimulate={handleSimulate}
        imapConnected={Boolean(stats?.worker_status?.imap_connected)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          title={getPageTitle()}
          subtitle="FileFlow System"
          workerStatus={stats?.worker_status}
          onSync={handleSync}
          onSimulate={handleSimulate}
          isSyncing={isSyncing}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-[#09090b]">
          {currentView === 'overview' && (
            <OverviewPage
              stats={stats}
              onNavigate={handleNavigate}
              onPreviewFile={(file) => setPreviewFile(file)}
              onSimulate={handleSimulate}
            />
          )}

          {currentView === 'files' && (
            <FilesPage
              initialCategory={selectedCategory}
              onPreviewFile={(file) => setPreviewFile(file)}
            />
          )}

          {currentView === 'emails' && (
            <EmailsPage
              onSelectEmail={(id) => setSelectedEmailId(id)}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPage
              workerStatus={stats?.worker_status}
              onRefreshStats={loadStats}
            />
          )}
        </main>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Email Detail Drawer */}
      {selectedEmailId !== null && (
        <EmailDetailDrawer
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
          onPreviewAttachment={(att) => {
            setPreviewFile(att);
          }}
        />
      )}

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl text-xs max-w-md ${
              toast.type === 'success'
                ? 'bg-[#101914] border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-[#1c1214] border-red-500/30 text-red-300'
                : 'bg-[#111622] border-blue-500/30 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
