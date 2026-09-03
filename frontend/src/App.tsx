import React, { useState, useEffect } from 'react';
import {
  Mail,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FolderArchive,
  RefreshCw,
  Search,
  Download,
  Eye,
  Trash2,
  Star,
  Paperclip,
  Send,
  X,
  Minus,
  Maximize2,
  ChevronLeft,
  Menu,
  Check,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Attachment, Email, FileCategory } from './types';
import { api } from './api/client';
import { FilePreviewModal } from './components/files/FilePreviewModal';

const HARDCODED_EMAIL = 'macrovaniac1@gmail.com';

type ViewFolder = 'INBOX' | 'PDF' | 'JPG' | 'VIDEO' | 'AUDIO' | 'OTHER';

export function App() {
  const [currentFolder, setCurrentFolder] = useState<ViewFolder>('INBOX');
  const [search, setSearch] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Selected email to view full Gmail reading pane
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Preview modal for attachments
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeSubject, setComposeSubject] = useState<string>('You are awesome!');
  const [composeText, setComposeText] = useState<string>('Congrats for sending test email with Mailtrap!');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Toast alert
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Load emails and files
  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getEmails({ page: 1, page_size: 100, search: search.trim() || undefined }),
      api.getFiles({ page: 1, page_size: 100, search: search.trim() || undefined, sort_by: 'date', sort_order: 'desc' }),
    ])
      .then(([emailRes, fileRes]) => {
        setEmails(emailRes.items);
        setFiles(fileRes.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Background auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      api.getEmails({ page: 1, page_size: 100, search: search.trim() || undefined })
        .then((res) => setEmails(res.items))
        .catch(() => {});
      api.getFiles({ page: 1, page_size: 100, search: search.trim() || undefined, sort_by: 'date', sort_order: 'desc' })
        .then((res) => setFiles(res.items))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [search]);

  // Send via Mailtrap
  const handleSendMailtrap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSending(true);
    try {
      const res = await api.sendViaMailtrap(composeSubject, composeText);
      setIsSending(false);
      setIsComposeOpen(false);
      loadData();
      showToast(res.message || 'Email sent via Mailtrap & attachments sorted into folders!');
    } catch (err: any) {
      setIsSending(false);
      showToast(`Error: ${err.message || err}`);
    }
  };

  // Sync / check inbox now
  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await api.triggerProcess();
      loadData();
      showToast('Checked inbox for new emails.');
    } catch (err: any) {
      showToast(`Sync error: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.deleteFile(id);
      loadData();
      showToast('File removed.');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // Filter files by folder
  const filteredFiles = files.filter((f) => {
    if (currentFolder === 'PDF') return f.file_category === 'PDF';
    if (currentFolder === 'JPG') return f.file_category === 'IMAGE';
    if (currentFolder === 'VIDEO') return f.file_category === 'VIDEO';
    if (currentFolder === 'AUDIO') return f.file_category === 'AUDIO';
    if (currentFolder === 'OTHER') return !['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(f.file_category);
    return true;
  });

  const pdfCount = files.filter((f) => f.file_category === 'PDF').length;
  const jpgCount = files.filter((f) => f.file_category === 'IMAGE').length;
  const videoCount = files.filter((f) => f.file_category === 'VIDEO').length;
  const audioCount = files.filter((f) => f.file_category === 'AUDIO').length;
  const otherCount = files.filter((f) => !['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(f.file_category)).length;

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'PDF':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1"><span>PDF</span></span>;
      case 'IMAGE':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1"><span>JPG / Image</span></span>;
      case 'VIDEO':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1"><span>Video</span></span>;
      case 'AUDIO':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1"><span>Audio</span></span>;
      default:
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">Other</span>;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f6f8fc] text-[#202124] overflow-hidden font-sans">
      
      {/* 1. Gmail Top Bar */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-[#dadce0] bg-[#f6f8fc] select-none z-20 shrink-0">
        {/* Left: Hamburger & Gmail Logo */}
        <div className="flex items-center space-x-3 w-64">
          <button className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            {/* Official Gmail Envelope SVG */}
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v.4l10 6.2 10-6.2V6z"/>
              <path fill="#EA4335" d="M22 6.4L12 12.6 2 6.4V18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6.4z"/>
            </svg>
            <span className="text-[21px] font-normal text-[#444746] tracking-tight font-sans">Gmail</span>
          </div>
        </div>

        {/* Center: Google Search Bar */}
        <div className="flex-1 max-w-2xl px-2">
          <div className="relative flex items-center bg-[#eaf1fb] hover:bg-[#e1eaf7] hover:shadow-sm focus-within:bg-white focus-within:shadow-md transition-all rounded-full px-4 py-2 border border-transparent focus-within:border-transparent">
            <Search className="w-5 h-5 text-[#5f6368] shrink-0" />
            <input
              type="text"
              placeholder="Search in mail or attachments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent px-3 text-sm text-[#202124] placeholder-[#5f6368] outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 hover:bg-[#dadce0] rounded-full text-[#5f6368]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Account Pill & Avatar */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-white border border-[#dadce0] px-3 py-1.5 rounded-full text-xs text-[#444746] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
            <span className="font-medium text-[#1f1f1f]">{HARDCODED_EMAIL}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white flex items-center justify-center text-sm font-semibold shadow-sm">
            M
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Gmail Left Navigation Sidebar */}
        <aside className="w-64 p-3 flex flex-col justify-between shrink-0 bg-[#f6f8fc] select-none">
          <div className="space-y-4">
            {/* Compose Button */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center space-x-3 bg-[#c2e7ff] hover:bg-[#b3dcf7] text-[#001d35] px-6 py-4 rounded-2xl shadow-sm hover:shadow transition-all font-medium text-sm"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <span className="font-semibold">Compose / Test</span>
            </button>

            {/* Folder Navigation */}
            <nav className="space-y-1">
              {[
                { id: 'INBOX' as const, label: 'Inbox (All Mails)', count: emails.length, icon: <Mail className="w-4 h-4" /> },
                { id: 'PDF' as const, label: 'PDF Folder', count: pdfCount, icon: <FileText className="w-4 h-4 text-[#d93025]" />, path: 'storage/pdf/' },
                { id: 'JPG' as const, label: 'JPG / Images', count: jpgCount, icon: <ImageIcon className="w-4 h-4 text-[#9334e6]" />, path: 'storage/jpg/' },
                { id: 'VIDEO' as const, label: 'Video Folder', count: videoCount, icon: <Video className="w-4 h-4 text-[#1a73e8]" />, path: 'storage/video/' },
                { id: 'AUDIO' as const, label: 'Audio Folder', count: audioCount, icon: <Music className="w-4 h-4 text-[#1e8e3e]" />, path: 'storage/audio/' },
                { id: 'OTHER' as const, label: 'Other Files', count: otherCount, icon: <FolderArchive className="w-4 h-4 text-[#5f6368]" />, path: 'storage/others/' },
              ].map((item) => {
                const isActive = currentFolder === item.id && !selectedEmail;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentFolder(item.id);
                      setSelectedEmail(null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#d3e3fd] text-[#041e49] font-bold'
                        : 'text-[#444746] hover:bg-[#e8eaed]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-[#5f6368]'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Hardcoded Target Info Card */}
          <div className="p-3 bg-white border border-[#e0e2e7] rounded-xl text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-1.5 text-[#1e8e3e] font-semibold text-[11px]">
              <Check className="w-3.5 h-3.5" />
              <span>Mailtrap Auto-Sorter Active</span>
            </div>
            <p className="text-[11px] text-[#5f6368] leading-tight">
              Incoming mail to <strong className="text-[#202124]">{HARDCODED_EMAIL}</strong> automatically sorts attachments into category folders.
            </p>
          </div>
        </aside>

        {/* 3. Main Content Container (White rounded card inside Gmail canvas) */}
        <main className="flex-1 bg-white m-3 ml-0 rounded-2xl border border-[#dadce0] shadow-sm flex flex-col overflow-hidden">
          
          {/* Action Toolbar */}
          <div className="h-12 px-4 border-b border-[#f1f3f4] flex items-center justify-between bg-white shrink-0 select-none">
            <div className="flex items-center space-x-2">
              {selectedEmail ? (
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center space-x-1 p-1.5 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] hover:text-[#202124] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-medium pl-1">Back to Inbox</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3 text-xs font-medium text-[#444746]">
                  <input type="checkbox" className="rounded text-[#0b57d0] focus:ring-0 cursor-pointer" />
                  <button
                    onClick={handleRefresh}
                    disabled={isSyncing}
                    className="p-1.5 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] hover:text-[#202124] transition-colors disabled:opacity-50"
                    title="Refresh mailbox"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#0b57d0]' : ''}`} />
                  </button>
                  <span className="text-[#80868b]">|</span>
                  <span className="font-semibold text-[#1f1f1f]">
                    {currentFolder === 'INBOX' ? 'Inbox' : `${currentFolder} Folder`}
                  </span>
                </div>
              )}
            </div>

            {/* Quick 1-Click Mailtrap Test Button */}
            {!selectedEmail && (
              <button
                onClick={() => handleSendMailtrap()}
                disabled={isSending}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#edf2fa] hover:bg-[#d3e3fd] text-[#0b57d0] text-xs font-semibold transition-colors border border-[#d3e3fd]"
                title="Send test email via Mailtrap with PDF, Video, Audio, and JPG attachments"
              >
                <Send className="w-3 h-3" />
                <span>{isSending ? 'Sending via Mailtrap...' : 'Quick Mailtrap Test'}</span>
              </button>
            )}
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className="bg-[#202124] text-white text-xs px-4 py-2.5 flex items-center justify-between animate-in fade-in duration-150">
              <span>{toast}</span>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* List or Email Reader View */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmail ? (
              /* Gmail Email Reading View */
              <div className="p-6 max-w-4xl space-y-6">
                <div className="border-b border-[#dadce0] pb-4">
                  <h1 className="text-xl font-medium text-[#202124] mb-3">{selectedEmail.subject || '(No Subject)'}</h1>
                  <div className="flex items-center justify-between text-xs text-[#5f6368]">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-[#ea4335] text-white flex items-center justify-center font-semibold text-sm">
                        {selectedEmail.sender[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <span className="font-bold text-[#202124]">{selectedEmail.sender}</span>
                        <div className="text-[11px] text-[#5f6368]">to: {selectedEmail.recipient || HARDCODED_EMAIL}</div>
                      </div>
                    </div>
                    <span className="font-mono">{selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : ''}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="text-sm text-[#3c4043] leading-relaxed whitespace-pre-wrap py-2">
                  {selectedEmail.body || 'No text content.'}
                </div>

                {/* Attachments Section */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-t border-[#dadce0] pt-4 space-y-3">
                    <h3 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                      {selectedEmail.attachments.length} Automatically Sorted Attachments
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEmail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] bg-[#f8fafd] hover:bg-[#eaf1fb] transition-colors"
                        >
                          <div
                            onClick={() => setPreviewFile(att)}
                            className="flex items-center space-x-3 truncate cursor-pointer flex-1"
                          >
                            <span className="p-2 bg-white rounded-lg border border-[#dadce0] shadow-2xl">
                              {att.file_category === 'PDF' && <FileText className="w-5 h-5 text-red-500" />}
                              {att.file_category === 'IMAGE' && <ImageIcon className="w-5 h-5 text-purple-500" />}
                              {att.file_category === 'VIDEO' && <Video className="w-5 h-5 text-blue-500" />}
                              {att.file_category === 'AUDIO' && <Music className="w-5 h-5 text-emerald-500" />}
                              {!['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(att.file_category) && <FolderArchive className="w-5 h-5 text-gray-500" />}
                            </span>
                            <div className="truncate">
                              <span className="font-medium text-xs text-[#1f1f1f] truncate block">{att.original_filename}</span>
                              <span className="text-[11px] text-[#5f6368] font-mono block">
                                Folder: {att.file_category.toLowerCase()} • {formatBytes(att.file_size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 pl-2">
                            <button
                              onClick={() => setPreviewFile(att)}
                              className="p-1.5 hover:bg-[#dadce0] rounded-full text-[#5f6368] hover:text-[#202124]"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={api.getFileDownloadUrl(att.id)}
                              download={att.original_filename}
                              className="p-1.5 hover:bg-[#dadce0] rounded-full text-[#5f6368] hover:text-[#202124]"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentFolder === 'INBOX' ? (
              /* Gmail Inbox List */
              loading ? (
                <div className="p-12 text-center text-xs text-[#5f6368]">Loading inbox...</div>
              ) : emails.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <Mail className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">Your inbox is empty</p>
                  <p className="text-xs text-[#80868b]">Click "Compose / Test" or "Quick Mailtrap Test" to send emails.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f1f3f4]">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="flex items-center px-4 py-3 hover:shadow-md hover:bg-[#f2f6fc] cursor-pointer transition-all text-xs group"
                    >
                      {/* Checkbox & Star */}
                      <div className="flex items-center space-x-3 mr-3 text-[#c4c7c5]" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-[#0b57d0] focus:ring-0 cursor-pointer" />
                        <Star className="w-4 h-4 hover:text-[#f4b400] text-[#dadce0] cursor-pointer" />
                      </div>

                      {/* Sender */}
                      <div className="w-48 font-semibold text-[#202124] truncate shrink-0">
                        {email.sender.replace(/<.*>/, '').trim() || email.sender}
                      </div>

                      {/* Subject, Snippet, and Attachment Chips */}
                      <div className="flex-1 flex items-center space-x-2 truncate pr-4">
                        <span className="font-medium text-[#202124] shrink-0 truncate max-w-xs">{email.subject || '(No Subject)'}</span>
                        <span className="text-[#5f6368] truncate shrink-0">— {email.body ? email.body.slice(0, 60) : 'No preview'}</span>

                        {/* Attachment Chips */}
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="flex items-center space-x-1.5 ml-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <Paperclip className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
                            {email.attachments.slice(0, 3).map((att) => (
                              <button
                                key={att.id}
                                onClick={() => setPreviewFile(att)}
                                className="px-2 py-0.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#e8eaed] text-[11px] text-[#444746] font-medium flex items-center space-x-1 shrink-0"
                              >
                                <span className="truncate max-w-[120px]">{att.original_filename}</span>
                              </button>
                            ))}
                            {email.attachments.length > 3 && (
                              <span className="text-[10px] text-[#5f6368]">+{email.attachments.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div className="w-20 text-right text-[11px] font-medium text-[#5f6368] font-mono shrink-0">
                        {email.received_at ? new Date(email.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Specific Folder File View (PDF, JPG, Video, Audio, Others) */
              loading ? (
                <div className="p-12 text-center text-xs text-[#5f6368]">Loading folder files...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <FolderArchive className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">{currentFolder} folder is empty</p>
                  <p className="text-xs text-[#80868b]">New {currentFolder} attachments received will be automatically stored in storage/{currentFolder.toLowerCase()}/</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f1f3f4]">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#f8fafd] transition-colors text-xs"
                    >
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="flex items-center space-x-3 cursor-pointer flex-1 truncate max-w-xl group"
                      >
                        <div className="p-2 bg-[#f1f3f4] rounded-lg text-[#5f6368] shrink-0">
                          {file.file_category === 'PDF' && <FileText className="w-4 h-4 text-red-600" />}
                          {file.file_category === 'IMAGE' && <ImageIcon className="w-4 h-4 text-purple-600" />}
                          {file.file_category === 'VIDEO' && <Video className="w-4 h-4 text-blue-600" />}
                          {file.file_category === 'AUDIO' && <Music className="w-4 h-4 text-emerald-600" />}
                          {!['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(file.file_category) && <FolderArchive className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-[#1f1f1f] group-hover:text-[#0b57d0] transition-colors truncate block">
                            {file.original_filename}
                          </span>
                          <span className="text-[11px] text-[#5f6368] truncate block">
                            From: {file.sender || 'Mailtrap'} • Size: {formatBytes(file.file_size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {getCategoryBadge(file.file_category)}
                        <span className="text-[11px] text-[#5f6368] font-mono hidden sm:inline">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124]"
                            title="Preview File"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={api.getFileDownloadUrl(file.id)}
                            download={file.original_filename}
                            className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124]"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-red-600"
                            title="Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* 4. Floating Gmail Compose Window */}
      {isComposeOpen && (
        <div className="fixed bottom-0 right-10 w-[500px] bg-white rounded-t-2xl shadow-2xl border border-[#dadce0] z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#f2f6fc] px-4 py-3 flex items-center justify-between border-b border-[#dadce0] select-none">
            <span className="text-xs font-semibold text-[#041e49]">New Message (Mailtrap Sender)</span>
            <div className="flex items-center space-x-2 text-[#444746]">
              <button className="p-1 hover:bg-[#dadce0] rounded"><Minus className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-[#dadce0] rounded"><Maximize2 className="w-3 h-3" /></button>
              <button onClick={() => setIsComposeOpen(false)} className="p-1 hover:bg-[#dadce0] rounded hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSendMailtrap} className="p-4 space-y-3 text-xs">
            <div className="border-b border-[#f1f3f4] pb-2 flex items-center">
              <span className="text-[#5f6368] w-12 font-medium">To:</span>
              <span className="font-semibold text-[#202124]">{HARDCODED_EMAIL}</span>
              <span className="ml-auto text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Hardcoded</span>
            </div>

            <div className="border-b border-[#f1f3f4] pb-2 flex items-center">
              <span className="text-[#5f6368] w-12 font-medium">Subject:</span>
              <input
                type="text"
                required
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="flex-1 outline-none text-[#202124] text-xs"
              />
            </div>

            <div>
              <textarea
                rows={4}
                required
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                className="w-full outline-none text-[#202124] text-xs resize-none"
              />
            </div>

            {/* Automatically Attached Files Chips */}
            <div className="bg-[#f8fafd] border border-[#dadce0] rounded-lg p-2.5 space-y-1.5">
              <span className="text-[11px] font-semibold text-[#5f6368] block">
                Auto-Attached Samples (Sorted into Folders):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px]">📄 contract_document.pdf</span>
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px]">🖼 profile_image.jpg</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px]">🎬 project_demo.mp4</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">🎵 voice_message.mp3</span>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-2 flex items-center justify-between border-t border-[#f1f3f4]">
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center space-x-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white px-5 py-2 rounded-full font-medium transition-colors shadow-sm disabled:opacity-50 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending via Mailtrap...' : 'Send via Mailtrap'}</span>
              </button>

              <span className="text-[10px] text-[#5f6368]">
                Uses Token: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">82e9299a...</code>
              </span>
            </div>
          </form>
        </div>
      )}

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
