import React, { useState, useEffect } from 'react';
import {
  Mail,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Folder,
  ExternalLink,
  Lock,
  X,
} from 'lucide-react';
import { Attachment, FileCategory, EmailConfig } from './types';
import { api } from './api/client';
import { FilePreviewModal } from './components/files/FilePreviewModal';

export function App() {
  // Config & State
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FileCategory | 'ALL'>('ALL');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Connect Form State
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Preview & Delete
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Load email settings
  const loadConfig = () => {
    api.getEmailSettings()
      .then((cfg) => {
        setEmailConfig(cfg);
        if (!cfg.is_connected) {
          setIsEditingEmail(true);
        }
      })
      .catch((err) => console.error(err));
  };

  // Load sorted files
  const loadFiles = () => {
    setLoadingFiles(true);
    const category = selectedFolder === 'ALL' ? undefined : selectedFolder;
    api.getFiles({
      category,
      page: 1,
      page_size: 100,
      sort_by: 'date',
      sort_order: 'desc',
    })
      .then((res) => {
        setFiles(res.items);
        setLoadingFiles(false);
      })
      .catch(() => setLoadingFiles(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [selectedFolder]);

  // Background auto-refresh every 10 seconds to show newly sorted files
  useEffect(() => {
    const interval = setInterval(() => {
      loadConfig();
      const category = selectedFolder === 'ALL' ? undefined : selectedFolder;
      api.getFiles({ category, page: 1, page_size: 100, sort_by: 'date', sort_order: 'desc' })
        .then((res) => setFiles(res.items))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedFolder]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;

    setConnecting(true);
    setConnectError(null);

    // Auto-detect host
    let host = 'imap.gmail.com';
    if (emailInput.includes('outlook') || emailInput.includes('hotmail')) {
      host = 'outlook.office365.com';
    } else if (emailInput.includes('yahoo')) {
      host = 'imap.mail.yahoo.com';
    }

    try {
      const cfg = await api.saveEmailSettings({
        email_host: host,
        email_port: 993,
        email_username: emailInput.trim(),
        email_password: passwordInput.trim(),
        email_use_ssl: true,
        email_folder: 'INBOX',
        auto_poll_enabled: true,
        poll_interval_seconds: 30,
      });

      setEmailConfig(cfg);
      setIsEditingEmail(false);
      setPasswordInput('');
      setMessage(`Connected to ${cfg.email_username}! Checking for emails every 30s.`);
      loadFiles();
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed. Check your email and password.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerProcess();
      loadFiles();
      loadConfig();
      setMessage(res.message || 'Mailbox checked.');
    } catch (err: any) {
      setMessage(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.deleteFile(id);
      loadFiles();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
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

  const folders: { id: FileCategory | 'ALL'; name: string; icon: React.ReactNode; path: string }[] = [
    { id: 'ALL', name: 'All Files', icon: <Folder className="w-4 h-4 text-zinc-300" />, path: 'storage/' },
    { id: 'PDF', name: 'PDFs', icon: <FileText className="w-4 h-4 text-red-400" />, path: 'storage/pdf/' },
    { id: 'IMAGE', name: 'Images', icon: <ImageIcon className="w-4 h-4 text-purple-400" />, path: 'storage/images/' },
    { id: 'DOCUMENT', name: 'Documents', icon: <FileCode className="w-4 h-4 text-blue-400" />, path: 'storage/documents/' },
    { id: 'SPREADSHEET', name: 'Spreadsheets', icon: <Table className="w-4 h-4 text-emerald-400" />, path: 'storage/spreadsheets/' },
    { id: 'PRESENTATION', name: 'Presentations', icon: <Presentation className="w-4 h-4 text-amber-400" />, path: 'storage/presentations/' },
    { id: 'OTHER', name: 'Others', icon: <FolderArchive className="w-4 h-4 text-zinc-400" />, path: 'storage/others/' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 font-sans p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <Mail className="w-5 h-5 text-blue-500" />
              <span>Email Attachment Sorter</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Connect your inbox — attachments are automatically detected and sorted into folders.
            </p>
          </div>

          {emailConfig?.is_connected && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors disabled:opacity-50 border border-zinc-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Checking mail...' : 'Sync Now'}</span>
            </button>
          )}
        </div>

        {/* Status Notification Banner */}
        {message && (
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </span>
            <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Email Connection Box */}
        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-sm">
          {emailConfig?.is_connected && !isEditingEmail ? (
            /* Connected state */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white flex items-center space-x-2">
                    <span>Connected: {emailConfig.email_username}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Auto-sorting incoming emails every 30 seconds into server directories.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEmailInput(emailConfig.email_username);
                  setIsEditingEmail(true);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline self-start sm:self-auto"
              >
                Change Email
              </button>
            </div>
          ) : (
            /* Connect Form */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Connect Your Email</h2>
                {emailConfig?.is_connected && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="your.email@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-zinc-400">App Password</label>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Gmail App Password</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="16-character app password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {connectError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={connecting || !emailInput || !passwordInput}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-40 transition-colors shadow-sm"
                >
                  {connecting ? 'Testing & Connecting...' : 'Connect & Start Auto-Sorting'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2. Folder Category Tabs */}
        <div>
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {folders.map((folder) => {
              const count = files.filter((f) => folder.id === 'ALL' || f.file_category === folder.id).length;
              const isSelected = selectedFolder === folder.id;

              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                      : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {folder.icon}
                  <span>{folder.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Sorted Files List */}
        <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">
              {selectedFolder === 'ALL' ? 'All Sorted Files' : `${selectedFolder} Folder`}
            </span>
            <span className="font-mono text-[11px]">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {loadingFiles ? (
            <div className="py-16 text-center text-xs text-zinc-500">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-400">Folder is empty</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {emailConfig?.is_connected
                  ? 'Send an email with attachments to your inbox — they will automatically appear here.'
                  : 'Connect your email above to start sorting attachments automatically.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-850">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors text-xs"
                >
                  {/* File Info */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center space-x-3 cursor-pointer truncate max-w-md group"
                  >
                    <span className="p-2 rounded-lg bg-zinc-900 shrink-0">
                      {getCategoryIcon(file.file_category)}
                    </span>
                    <div className="truncate">
                      <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate block">
                        {file.original_filename}
                      </span>
                      <span className="text-[11px] text-zinc-500 truncate block">
                        From: {file.sender || 'Unknown'} • {formatBytes(file.file_size)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline mr-3">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={api.getFileDownloadUrl(file.id)}
                      download={file.original_filename}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export default App;
