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
  Paperclip,
  X,
  ArrowLeft,
  Inbox,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { Attachment, Email } from './types';
import { api } from './api/client';
import { FilePreviewModal } from './components/files/FilePreviewModal';
import { FileGalleryCard } from './components/files/FileGalleryCard';

const MY_EMAIL = ((import.meta as any).env?.VITE_EMAIL_ADDRESS as string) || 'amalnathvp@zohomail.in';

type ViewFolder = 'INBOX' | 'PDF' | 'JPG' | 'VIDEO' | 'AUDIO' | 'OTHER';

export function App() {
  const [currentFolder, setCurrentFolder] = useState<ViewFolder>('INBOX');
  const [search, setSearch] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Multi-select for emails
  const [selectedEmailIds, setSelectedEmailIds] = useState<number[]>([]);

  // Selected email for reading pane
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // File preview modal
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Status toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch emails and categorized files (fast from Supabase)
  const loadData = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
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
    loadData(true);
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Periodic background check (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      api.getEmails({ page: 1, page_size: 100, search: search.trim() || undefined })
        .then((res) => setEmails(res.items))
        .catch(() => {});
      api.getFiles({ page: 1, page_size: 100, search: search.trim() || undefined, sort_by: 'date', sort_order: 'desc' })
        .then((res) => setFiles(res.items))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [search]);

  // Email Selection Handlers
  const handleToggleEmailSelect = (id: number) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmails = () => {
    if (selectedEmailIds.length === emails.length && emails.length > 0) {
      setSelectedEmailIds([]);
    } else {
      setSelectedEmailIds(emails.map((e) => e.id));
    }
  };

  const handleDeleteSelectedEmails = async () => {
    if (selectedEmailIds.length === 0) return;
    const idsToDelete = [...selectedEmailIds];
    const count = idsToDelete.length;

    // Snapshot for rollback if network fails
    const prevEmails = emails;
    const prevFiles = files;
    const prevSelectedIds = selectedEmailIds;
    const prevSelectedEmail = selectedEmail;

    // Instant optimistic update (0ms delay)
    setEmails((prev) => prev.filter((e) => !idsToDelete.includes(e.id)));
    setFiles((prev) => prev.filter((f) => !idsToDelete.includes(f.email_id || 0)));
    setSelectedEmailIds([]);
    if (selectedEmail && idsToDelete.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
    showToast(`Deleted ${count} email${count > 1 ? 's' : ''}.`);

    try {
      await api.batchDeleteEmails(idsToDelete);
    } catch (err: any) {
      setEmails(prevEmails);
      setFiles(prevFiles);
      setSelectedEmailIds(prevSelectedIds);
      setSelectedEmail(prevSelectedEmail);
      showToast(`Delete failed: ${err.message || err}`);
    }
  };

  const handleDeleteSingleEmail = async (id: number) => {
    // Snapshot for rollback if network fails
    const prevEmails = emails;
    const prevFiles = files;
    const prevSelectedIds = selectedEmailIds;
    const prevSelectedEmail = selectedEmail;

    // Instant optimistic update (0ms delay)
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setFiles((prev) => prev.filter((f) => f.email_id !== id));
    setSelectedEmailIds((prev) => prev.filter((item) => item !== id));
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail(null);
    }
    showToast('Email deleted.');

    try {
      await api.deleteEmail(id);
    } catch (err: any) {
      setEmails(prevEmails);
      setFiles(prevFiles);
      setSelectedEmailIds(prevSelectedIds);
      setSelectedEmail(prevSelectedEmail);
      showToast(`Delete failed: ${err.message || err}`);
    }
  };

  // Refresh inbox
  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerProcess();
      loadData(false);
      showToast(res.message || 'Checked inbox for incoming emails.');
    } catch (err: any) {
      showToast(`Check error: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    const prevFiles = files;
    const prevEmails = emails;

    // Instant optimistic update (0ms delay)
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setEmails((prev) =>
      prev.map((e) => ({
        ...e,
        attachments: e.attachments?.filter((a) => a.id !== id),
        attachment_count: Math.max(0, (e.attachment_count || 1) - (e.attachments?.some((a) => a.id === id) ? 1 : 0)),
      }))
    );
    showToast('File deleted.');

    try {
      await api.deleteFile(id);
    } catch (err: any) {
      setFiles(prevFiles);
      setEmails(prevEmails);
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
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[11px] font-medium">PDF</span>;
      case 'IMAGE':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-medium">JPG / Image</span>;
      case 'VIDEO':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium">Video</span>;
      case 'AUDIO':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">Audio</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">Other</span>;
    }
  };

  const folderItems = [
    { id: 'INBOX' as const, label: 'All Mails', fullLabel: 'All Received Mails', count: emails.length, icon: <Mail className="w-4 h-4 text-[#1a73e8]" /> },
    { id: 'PDF' as const, label: 'PDF', fullLabel: 'PDF Folder', count: pdfCount, icon: <FileText className="w-4 h-4 text-[#d93025]" /> },
    { id: 'JPG' as const, label: 'Images', fullLabel: 'JPG / Images', count: jpgCount, icon: <ImageIcon className="w-4 h-4 text-[#9334e6]" /> },
    { id: 'VIDEO' as const, label: 'Video', fullLabel: 'Video Folder', count: videoCount, icon: <Video className="w-4 h-4 text-[#1a73e8]" /> },
    { id: 'AUDIO' as const, label: 'Audio', fullLabel: 'Audio Folder', count: audioCount, icon: <Music className="w-4 h-4 text-[#1e8e3e]" /> },
    { id: 'OTHER' as const, label: 'Other', fullLabel: 'Other Files', count: otherCount, icon: <FolderArchive className="w-4 h-4 text-[#5f6368]" /> },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f6f8fc] text-[#202124] overflow-hidden font-sans">
      
      {/* Mobile Navigation Drawer (Slide-over) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#f6f8fc] h-full shadow-2xl flex flex-col p-4 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#e8f0fe] rounded-xl text-[#1a73e8]">
                  <Mail className="w-5 h-5 text-[#1a73e8]" />
                </div>
                <span className="font-bold text-[#1f2937] text-base">Mail Extractor</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#dadce0] text-[#5f6368] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mailbox Status */}
            <div className="py-2.5 px-3 my-3 bg-white rounded-xl border border-[#dadce0] text-xs space-y-1 shadow-xs">
              <div className="flex items-center space-x-1.5 text-[11px] text-[#5f6368]">
                <span className="w-2 h-2 rounded-full bg-[#1e8e3e] animate-pulse" />
                <span>Active Inbox</span>
              </div>
              <div className="font-semibold text-[#1f1f1f] truncate text-xs">{MY_EMAIL}</div>
            </div>

            {/* Folders List in Drawer */}
            <nav className="space-y-1 flex-1 overflow-y-auto mt-1">
              {folderItems.map((item) => {
                const isActive = currentFolder === item.id && !selectedEmail;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentFolder(item.id);
                      setSelectedEmail(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#dbeafe] text-[#1e40af] font-bold shadow-xs'
                        : 'text-[#444746] hover:bg-[#e8eaed]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.fullLabel}</span>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-[#bfdbfe] text-[#1e40af]' : 'text-[#5f6368]'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* 1. Header (Mail Extractor) */}
      <header className="h-16 px-3 sm:px-5 flex items-center justify-between border-b border-[#dadce0] bg-[#f6f8fc] select-none z-20 shrink-0 gap-2">
        {/* Left: Hamburger (mobile only) + Logo & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#e8eaed] rounded-full transition-colors"
            title="Open folders menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="p-2 bg-[#e8f0fe] rounded-xl text-[#1a73e8] shadow-sm">
            <Mail className="w-5 h-5 text-[#1a73e8]" />
          </div>
          <span className="text-base sm:text-lg md:text-[20px] font-bold text-[#1f2937] tracking-tight">Mail Extractor</span>
        </div>

        {/* Search Bar (Desktop & Tablet) */}
        <div className="hidden md:flex flex-1 max-w-2xl px-2">
          <div className="w-full relative flex items-center bg-[#eaf1fb] hover:bg-[#e1eaf7] hover:shadow-sm focus-within:bg-white focus-within:shadow-md transition-all rounded-full px-4 py-2 border border-transparent">
            <Search className="w-5 h-5 text-[#5f6368] shrink-0" />
            <input
              type="text"
              placeholder="Search incoming emails or file attachments..."
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

        {/* Navbar Right: Active Mailbox & Avatar */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="hidden sm:flex items-center space-x-2 bg-white border border-[#dadce0] px-3.5 py-1.5 rounded-full text-xs text-[#444746] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e8e3e] animate-pulse" />
            <span className="text-[#5f6368]">Inbox:</span>
            <span className="font-semibold text-[#1f1f1f] truncate max-w-[180px]">{MY_EMAIL}</span>
          </div>

          <div className="sm:hidden flex items-center space-x-1.5 bg-white border border-[#dadce0] px-2.5 py-1 rounded-full text-xs shadow-xs" title={`Inbox: ${MY_EMAIL}`}>
            <span className="w-2 h-2 rounded-full bg-[#1e8e3e] animate-pulse" />
            <span className="text-[11px] font-medium text-[#1f1f1f]">Live</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-sm font-bold shadow-sm">
            A
          </div>
        </div>
      </header>

      {/* Mobile Search Bar Row (md:hidden) */}
      <div className="md:hidden px-3 pt-2 pb-1.5 bg-[#f6f8fc] border-b border-[#dadce0]/60 shrink-0">
        <div className="relative flex items-center bg-[#eaf1fb] focus-within:bg-white focus-within:shadow-sm transition-all rounded-full px-3.5 py-1.5 border border-transparent">
          <Search className="w-4 h-4 text-[#5f6368] shrink-0" />
          <input
            type="text"
            placeholder="Search emails or attachments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2.5 text-xs text-[#202124] placeholder-[#5f6368] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-0.5 hover:bg-[#dadce0] rounded-full text-[#5f6368]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Quick Folder Carousel (md:hidden) */}
      <div className="md:hidden flex items-center space-x-2 px-3 py-2 bg-[#f6f8fc] overflow-x-auto no-scrollbar border-b border-[#dadce0] shrink-0">
        {folderItems.map((item) => {
          const isActive = currentFolder === item.id && !selectedEmail;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentFolder(item.id);
                setSelectedEmail(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-[#dbeafe] text-[#1e40af] font-bold shadow-xs'
                  : 'bg-white border border-[#dadce0] text-[#444746] hover:bg-[#e8eaed]'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#bfdbfe] text-[#1e40af]' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Left Folder Sidebar (Desktop only) */}
        <aside className="hidden md:flex w-64 p-3 flex-col shrink-0 bg-[#f6f8fc] select-none">
          <div className="space-y-4">
            <nav className="space-y-1">
              {folderItems.map((item) => {
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
                        ? 'bg-[#dbeafe] text-[#1e40af] font-bold shadow-sm'
                        : 'text-[#444746] hover:bg-[#e8eaed]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.fullLabel}</span>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-[#bfdbfe] text-[#1e40af]' : 'text-[#5f6368]'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 3. Main Workspace Container */}
        <main className="flex-1 bg-white md:m-3 md:ml-0 md:rounded-2xl border-0 md:border md:border-[#dadce0] shadow-none md:shadow-sm flex flex-col overflow-hidden">
          
          {/* Action Toolbar */}
          <div className="h-12 px-3 sm:px-4 border-b border-[#f1f3f4] flex items-center justify-between bg-white shrink-0 select-none">
            <div className="flex items-center space-x-2 min-w-0">
              {selectedEmail ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="flex items-center space-x-1 p-1.5 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] hover:text-[#202124] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-medium pl-0.5 sm:pl-1">Back</span>
                  </button>
                  <span className="text-[#80868b]">|</span>
                  <button
                    onClick={() => handleDeleteSingleEmail(selectedEmail.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-red-50 text-gray-600 hover:text-red-600 font-medium text-xs transition-colors"
                    title="Delete this email"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-medium text-[#444746]">
                  {currentFolder === 'INBOX' && (
                    <input
                      type="checkbox"
                      checked={selectedEmailIds.length === emails.length && emails.length > 0}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectedEmailIds.length > 0 && selectedEmailIds.length < emails.length;
                        }
                      }}
                      onChange={handleSelectAllEmails}
                      className="rounded text-[#1a73e8] focus:ring-0 cursor-pointer w-4 h-4"
                      title={selectedEmailIds.length === emails.length && emails.length > 0 ? 'Deselect all' : 'Select all'}
                    />
                  )}

                  <button
                    onClick={handleRefresh}
                    disabled={isSyncing}
                    className="p-1.5 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] hover:text-[#202124] transition-colors disabled:opacity-50"
                    title="Check inbox for incoming emails"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#1a73e8]' : ''}`} />
                  </button>

                  {selectedEmailIds.length > 0 ? (
                    <div className="flex items-center space-x-2 pl-2 border-l border-[#dadce0]">
                      <span className="font-bold text-[#1a73e8] text-xs">
                        {selectedEmailIds.length} selected
                      </span>
                      <button
                        onClick={handleDeleteSelectedEmails}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs border border-red-200 transition-colors shadow-xs"
                        title="Delete selected emails"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[#80868b] hidden sm:inline">|</span>
                      <span className="font-semibold text-[#1f1f1f] text-xs sm:text-sm truncate">
                        {currentFolder === 'INBOX' ? `Incoming Mails (${emails.length})` : `${currentFolder} Folder`}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Toast Notification */}
          {toast && (
            <div className="bg-[#202124] text-white text-xs px-4 py-2.5 flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{toast}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmail ? (
              /* Email Reading Pane */
              <div className="p-3.5 sm:p-6 max-w-4xl space-y-4 sm:space-y-6">
                <div className="border-b border-[#dadce0] pb-4">
                  <h1 className="text-lg sm:text-xl font-medium text-[#202124] mb-2.5 sm:mb-3 break-words">{selectedEmail.subject || '(No Subject)'}</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#5f6368] gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-semibold text-sm shrink-0">
                        {selectedEmail.sender[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-[#202124] truncate block">{selectedEmail.sender}</span>
                        <div className="text-[11px] text-[#5f6368] truncate">to: {selectedEmail.recipient || MY_EMAIL}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] sm:text-xs shrink-0">{selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : ''}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="text-sm text-[#3c4043] leading-relaxed whitespace-pre-wrap py-2 break-words overflow-x-auto">
                  {selectedEmail.body || 'No text content.'}
                </div>

                {/* Arranged Attachments Cards */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-t border-[#dadce0] pt-4 space-y-3">
                    <h3 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                      {selectedEmail.attachments.length} Attachments Arranged into Folders:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {selectedEmail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] bg-[#f8fafd] hover:bg-[#eaf1fb] transition-colors"
                        >
                          <div
                            onClick={() => setPreviewFile(att)}
                            className="flex items-center space-x-3 truncate cursor-pointer flex-1 min-w-0"
                          >
                            <span className="p-2 bg-white rounded-lg border border-[#dadce0] shadow-sm shrink-0">
                              {att.file_category === 'PDF' && <FileText className="w-5 h-5 text-red-500" />}
                              {att.file_category === 'IMAGE' && <ImageIcon className="w-5 h-5 text-purple-500" />}
                              {att.file_category === 'VIDEO' && <Video className="w-5 h-5 text-blue-500" />}
                              {att.file_category === 'AUDIO' && <Music className="w-5 h-5 text-emerald-500" />}
                              {!['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(att.file_category) && <FolderArchive className="w-5 h-5 text-gray-500" />}
                            </span>
                            <div className="truncate">
                              <span className="font-medium text-xs text-[#1f1f1f] truncate block">{att.original_filename}</span>
                              <span className="text-[11px] text-[#5f6368] font-mono block">
                                Folder: storage/{att.file_category.toLowerCase()}/ • {formatBytes(att.file_size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 pl-2 shrink-0">
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
              /* Inbox: List of Incoming Emails */
              loading && emails.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#5f6368] flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#1a73e8]" />
                  <span>Loading emails from Supabase...</span>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-12 sm:p-16 text-center space-y-2">
                  <Mail className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">No incoming emails yet</p>
                  <p className="text-xs text-[#80868b]">No emails found. Send an email with attachments to your inbox or click the sync button above to check.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f1f3f4]">
                  {emails.map((email) => {
                    const isSelected = selectedEmailIds.includes(email.id);
                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors text-xs group flex flex-col space-y-1.5 sm:space-y-2 ${
                          isSelected ? 'bg-[#e8f0fe]' : 'hover:bg-[#f8fafd]'
                        }`}
                      >
                        {/* Mobile Email Card View (md:hidden) */}
                        <div className="md:hidden flex flex-col space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleEmailSelect(email.id)}
                                  className="rounded text-[#1a73e8] focus:ring-0 cursor-pointer w-4 h-4 mt-0.5"
                                />
                              </div>
                              <span className="font-bold text-[#202124] text-xs truncate">
                                {email.sender.replace(/<.*>/, '').trim() || email.sender}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <span className="text-[10px] font-mono text-[#5f6368]">
                                {email.received_at ? new Date(email.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingleEmail(email.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                title="Delete this email"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pl-6.5">
                            <div className="font-semibold text-[#1f1f1f] text-xs truncate">
                              {email.subject || '(No Subject)'}
                            </div>
                            <div className="text-[#5f6368] text-[11px] line-clamp-2 mt-0.5 leading-snug">
                              {email.body ? email.body.slice(0, 100) : 'No preview available'}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Email Header Row (hidden md:flex) */}
                        <div className="hidden md:flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleEmailSelect(email.id)}
                                className="rounded text-[#1a73e8] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                              />
                            </div>

                            <div className="w-44 font-bold text-[#202124] truncate shrink-0">
                              {email.sender.replace(/<.*>/, '').trim() || email.sender}
                            </div>

                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-semibold text-[#1f1f1f] truncate shrink-0 max-w-sm">
                                {email.subject || '(No Subject)'}
                              </span>
                              <span className="text-[#5f6368] truncate text-[11px] hidden md:inline">
                                — {email.body ? email.body.slice(0, 80) : 'No preview available'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-right text-[11px] font-medium text-[#5f6368] font-mono">
                              {email.received_at ? new Date(email.received_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleEmail(email.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                              title="Delete this email"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Attachment Files: Prominently displayed beneath the email row */}
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="flex items-center space-x-2 pl-0 sm:pl-7 flex-wrap gap-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-1 text-[#5f6368] font-medium text-[11px] mr-1 shrink-0">
                              <Paperclip className="w-3.5 h-3.5 text-[#1a73e8]" />
                              <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}:</span>
                            </div>
                            {email.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={api.getFileDownloadUrl(att.id)}
                                download={att.original_filename}
                                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-lg border border-[#dadce0] bg-white hover:bg-[#e8f0fe] hover:border-[#1a73e8] text-[#1a73e8] font-medium text-[11px] transition-all shadow-xs group/att"
                                title={`Click to download ${att.original_filename} (storage/${att.file_category.toLowerCase()}/ • ${formatBytes(att.file_size)})`}
                              >
                                {att.file_category === 'PDF' && <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                {att.file_category === 'IMAGE' && <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                {att.file_category === 'VIDEO' && <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {att.file_category === 'AUDIO' && <Music className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                {!['PDF', 'IMAGE', 'VIDEO', 'AUDIO'].includes(att.file_category) && <FolderArchive className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                <span className="font-semibold text-gray-800 group-hover/att:text-[#1a73e8] truncate max-w-[140px] sm:max-w-[200px]">{att.original_filename}</span>
                                <span className="text-[10px] text-gray-500 font-mono">({formatBytes(att.file_size)})</span>
                                <Download className="w-3 h-3 text-[#1a73e8] opacity-70 group-hover/att:opacity-100 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Specific Folder View (PDF, JPG, Video, Audio, Other) */
              loading ? (
                <div className="p-12 text-center text-xs text-[#5f6368]">Loading files...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-12 sm:p-16 text-center space-y-2">
                  <FolderArchive className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">{currentFolder} folder is empty</p>
                  <p className="text-xs text-[#80868b]">Incoming {currentFolder} attachments will automatically be stored in storage/{currentFolder.toLowerCase()}/</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-5">
                  {filteredFiles.map((file) => (
                    <FileGalleryCard
                      key={file.id}
                      file={file}
                      onPreview={(f) => setPreviewFile(f)}
                      onDelete={handleDeleteFile}
                      formatBytes={formatBytes}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </main>
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
