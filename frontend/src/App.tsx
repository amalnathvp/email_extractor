import React, { useState, useEffect } from 'react';
import {
  Mail,
  Files,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  RefreshCw,
  Search,
  Download,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  X,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Attachment, Email, FileCategory, DashboardStats, EmailConfig } from './types';
import { api } from './api/client';
import { FilePreviewModal } from './components/files/FilePreviewModal';
import { EmailDetailDrawer } from './components/emails/EmailDetailDrawer';
import { ConnectEmailModal } from './components/settings/ConnectEmailModal';

export function App() {
  // Navigation: folder tabs or emails
  const [activeTab, setActiveTab] = useState<FileCategory | 'ALL' | 'EMAILS'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Data
  const [files, setFiles] = useState<Attachment[]>([]);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [emails, setEmails] = useState<Email[]>([]);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);

  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Load stats and email configuration
  const loadGlobalData = () => {
    api.getStats()
      .then((s) => setStats(s))
      .catch((err) => console.error('Failed to load stats:', err));

    api.getEmailSettings()
      .then((cfg) => setEmailConfig(cfg))
      .catch((err) => console.error('Failed to load email config:', err));
  };

  // Load files or emails based on activeTab
  const loadTabContent = () => {
    setLoading(true);
    if (activeTab === 'EMAILS') {
      api.getEmails({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
      })
        .then((res) => {
          setEmails(res.items);
          setTotalEmails(res.total);
          setTotalPages(res.total_pages);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      const categoryFilter = activeTab === 'ALL' ? undefined : activeTab;
      api.getFiles({
        page,
        page_size: pageSize,
        category: categoryFilter,
        search: search.trim() || undefined,
        sort_by: 'date',
        sort_order: 'desc',
      })
        .then((res) => {
          setFiles(res.items);
          setTotalFiles(res.total);
          setTotalPages(res.total_pages);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  useEffect(() => {
    loadTabContent();
  }, [activeTab, page]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadTabContent();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Background auto-refresh every 8 seconds to automatically display incoming sorted files
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadGlobalData();
      // Silently refresh current view without full page reload spinner
      if (activeTab === 'EMAILS') {
        api.getEmails({ page, page_size: pageSize, search: search.trim() || undefined })
          .then((res) => {
            setEmails(res.items);
            setTotalEmails(res.total);
          })
          .catch(() => {});
      } else {
        const categoryFilter = activeTab === 'ALL' ? undefined : activeTab;
        api.getFiles({ page, page_size: pageSize, category: categoryFilter, search: search.trim() || undefined })
          .then((res) => {
            setFiles(res.items);
            setTotalFiles(res.total);
          })
          .catch(() => {});
      }
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [activeTab, page, search]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerProcess();
      loadGlobalData();
      loadTabContent();
      if (res.success) {
        showToast(res.message || 'Mailbox checked! All attachments sorted.', 'success');
      } else {
        showToast(res.message || 'Sync encountered an error', 'error');
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulateDemo = async () => {
    try {
      showToast('Generating demo email with PDF, Image, Word & CSV...', 'info');
      const res = await api.simulateEmail('standard');
      loadGlobalData();
      loadTabContent();
      if (res.success) {
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteFile(deleteTarget.id);
      setDeleteTarget(null);
      loadGlobalData();
      loadTabContent();
      showToast('File removed successfully.');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message || err}`, 'error');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'IMAGE':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'DOCUMENT':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'SPREADSHEET':
        return <Table className="w-4 h-4 text-emerald-400" />;
      case 'PRESENTATION':
        return <Presentation className="w-4 h-4 text-amber-400" />;
      default:
        return <FolderArchive className="w-4 h-4 text-zinc-400" />;
    }
  };

  const folderTabs = [
    { id: 'ALL' as const, label: 'All Files', count: stats?.total_attachments ?? 0 },
    { id: 'PDF' as const, label: 'PDFs', count: stats?.categories.PDF ?? 0, icon: <FileText className="w-3.5 h-3.5 text-red-400" /> },
    { id: 'IMAGE' as const, label: 'Images', count: stats?.categories.IMAGE ?? 0, icon: <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'DOCUMENT' as const, label: 'Documents', count: stats?.categories.DOCUMENT ?? 0, icon: <FileCode className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'SPREADSHEET' as const, label: 'Spreadsheets', count: stats?.categories.SPREADSHEET ?? 0, icon: <Table className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'PRESENTATION' as const, label: 'Presentations', count: stats?.categories.PRESENTATION ?? 0, icon: <Presentation className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'OTHER' as const, label: 'Others', count: stats?.categories.OTHER ?? 0, icon: <FolderArchive className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'EMAILS' as const, label: 'Email Inbox', count: stats?.total_emails ?? 0, icon: <Mail className="w-3.5 h-3.5 text-blue-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Top Clean Header */}
      <header className="border-b border-zinc-800/80 bg-[#0d0d10] sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand Logo & Status */}
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight text-white">FileFlow</span>
                <span className="text-zinc-600 text-xs">•</span>
                <span className="text-xs text-zinc-400">Email Attachment Sorter</span>
              </div>

              {/* Status Pill */}
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="flex items-center space-x-1.5 mt-0.5 group text-left"
              >
                {emailConfig?.is_connected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Live sync with <strong className="text-zinc-200">{emailConfig.email_username}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[11px] text-amber-400/90 group-hover:text-amber-300 transition-colors font-medium">
                      Email not connected — Click to connect
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Controls: Search, Sync Now, Connect Email */}
          <div className="flex items-center space-x-2.5">
            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search files or senders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-44 sm:w-56"
              />
            </div>

            {/* Sync Now Button */}
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 text-xs font-medium transition-colors disabled:opacity-50"
              title="Check mailbox and sort new files immediately"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-zinc-400'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Connect Email Button */}
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{emailConfig?.is_connected ? 'Email Settings' : 'Connect Email'}</span>
            </button>

            {/* Quick Demo Simulator */}
            <button
              onClick={handleSimulateDemo}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
              title="Generate simulated test email with PDF, Image, Word & CSV"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Folder Navigation Bar (Clean Tabs) */}
      <nav className="border-b border-zinc-850 bg-[#09090b] px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-2.5 no-scrollbar">
          {folderTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4">
        {activeTab === 'EMAILS' ? (
          /* Email Inbox View */
          <div className="bg-[#0f0f13] border border-zinc-850 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Processed Emails</h2>
                <p className="text-xs text-zinc-500">Emails received and scanned for attachments</p>
              </div>
              <span className="text-xs font-mono text-zinc-400">{totalEmails} emails recorded</span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-zinc-500">Loading inbox...</div>
            ) : emails.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <p className="text-sm text-zinc-400 font-medium">No emails found</p>
                <p className="text-xs text-zinc-600">Connect your email or click "Sync Now" to process new emails.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-850 bg-zinc-900/30 text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Attachments</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                  {emails.map((email) => (
                    <tr
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      className="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5 max-w-md truncate">
                          <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                            {email.subject || '(No Subject)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 font-medium truncate max-w-xs">{email.sender}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {email.attachment_count} files sorted
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {email.received_at ? new Date(email.received_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-zinc-500 group-hover:text-white transition-colors">
                          <ArrowRight className="w-4 h-4 inline" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* File Browser Table */
          <div className="bg-[#0f0f13] border border-zinc-850 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  {activeTab === 'ALL' ? 'All Sorted Attachments' : `${activeTab} Files`}
                </h2>
                <p className="text-xs text-zinc-500">
                  Automatically extracted and organized by file type
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400">{totalFiles} files</span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-zinc-500">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <p className="text-sm text-zinc-400 font-medium">No files in this folder</p>
                <p className="text-xs text-zinc-600">
                  Incoming attachments from your inbox will be sorted here automatically.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-850 bg-zinc-900/30 text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Folder / Category</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">From (Sender)</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3 max-w-sm truncate">
                          <span className="p-1.5 rounded-md bg-zinc-900 shrink-0">
                            {getCategoryIcon(file.file_category)}
                          </span>
                          <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                            {file.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {file.file_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 truncate max-w-xs">{file.sender || '—'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title="Preview File"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={api.getFileDownloadUrl(file.id)}
                            download={file.original_filename}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setDeleteTarget(file)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-850 pt-3 text-xs text-zinc-400">
            <span className="font-mono text-[11px]">Page {page} of {totalPages}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Connect Email Modal */}
      <ConnectEmailModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSaved={(newConfig) => {
          setEmailConfig(newConfig);
          loadGlobalData();
          loadTabContent();
          showToast(`Connected to ${newConfig.email_username}! Auto-syncing every ${newConfig.poll_interval_seconds}s.`);
        }}
        currentConfig={emailConfig}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Email Details Drawer */}
      {selectedEmailId !== null && (
        <EmailDetailDrawer
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
          onPreviewAttachment={(att) => {
            setPreviewFile(att);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-zinc-100">Delete File</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-200">{deleteTarget.original_filename}</strong>? This removes it from storage.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFile}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
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
