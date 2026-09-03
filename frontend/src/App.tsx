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
  X,
  ArrowLeft,
  Inbox,
  UserCheck,
  CheckCircle2,
  Key,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Attachment, Email } from './types';
import { api } from './api/client';
import { FilePreviewModal } from './components/files/FilePreviewModal';

const MY_EMAIL = 'amalnathvp@zohomail.in';

type ViewFolder = 'INBOX' | 'PDF' | 'JPG' | 'VIDEO' | 'AUDIO' | 'OTHER';

export function App() {
  const [currentFolder, setCurrentFolder] = useState<ViewFolder>('INBOX');
  const [search, setSearch] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);

  // Selected email for reading pane
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // File preview modal
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Zoho Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [zohoPassword, setZohoPassword] = useState<string>('');
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isConnectedLive, setIsConnectedLive] = useState<boolean>(false);

  // Status toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch emails and categorized files
  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getEmails({ page: 1, page_size: 100, search: search.trim() || undefined }),
      api.getFiles({ page: 1, page_size: 100, search: search.trim() || undefined, sort_by: 'date', sort_order: 'desc' }),
      api.getEmailSettings().catch(() => null),
    ])
      .then(([emailRes, fileRes, settingsRes]) => {
        setEmails(emailRes.items);
        setFiles(fileRes.items);
        if (settingsRes) {
          setIsConnectedLive(settingsRes.is_connected);
        }
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

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Periodic inbox check (every 8s)
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

  // Save Zoho Password
  const handleSaveZohoPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      await api.saveEmailSettings({
        email_host: 'imap.zoho.in',
        email_port: 993,
        email_username: MY_EMAIL,
        email_password: zohoPassword.trim(),
        email_use_ssl: true,
        email_folder: 'INBOX',
        auto_poll_enabled: true,
        poll_interval_seconds: 30,
      });
      setIsConnectedLive(true);
      setIsSavingPassword(false);
      setIsPasswordModalOpen(false);
      setZohoPassword('');
      showToast('Connected to Zoho Mail! Background syncing is now active.');
      loadData();
    } catch (err: any) {
      setIsSavingPassword(false);
      setPasswordError(err.message || 'Failed to authenticate with Zoho Mail.');
    }
  };

  // Receive a new incoming email from an external sender (test intake)
  const handleReceiveEmail = async () => {
    setIsReceiving(true);
    try {
      const res = await api.simulateEmail('standard');
      loadData();
      showToast(res.message || `Received incoming email to ${MY_EMAIL} and arranged all attachments!`);
    } catch (err: any) {
      showToast(`Intake error: ${err.message || err}`);
    } finally {
      setIsReceiving(false);
    }
  };

  // Refresh inbox
  const handleRefresh = async () => {
    setIsReceiving(true);
    try {
      const res = await api.triggerProcess();
      loadData();
      showToast(res.message || 'Checked Zoho inbox for incoming emails.');
    } catch (err: any) {
      showToast(`Check error: ${err.message || err}`);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!window.confirm('Delete this file from storage?')) return;
    try {
      await api.deleteFile(id);
      loadData();
      showToast('File deleted.');
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

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f6f8fc] text-[#202124] overflow-hidden font-sans">
      
      {/* 1. Header (Zoho Mail Theme) */}
      <header className="h-16 px-5 flex items-center justify-between border-b border-[#dadce0] bg-[#f6f8fc] select-none z-20 shrink-0">
        {/* Logo & Zoho Brand */}
        <div className="flex items-center space-x-3 w-80">
          {/* Zoho Mail stylized 4-color emblem */}
          <div className="flex items-center space-x-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#e42528]"></div>
            <div className="w-3.5 h-3.5 rounded-sm bg-[#228b22]"></div>
            <div className="w-3.5 h-3.5 rounded-sm bg-[#0066cc]"></div>
            <div className="w-3.5 h-3.5 rounded-sm bg-[#ffbf00]"></div>
          </div>
          <div>
            <span className="text-[19px] font-bold text-[#1f2937] tracking-tight">Zoho Mail</span>
            <span className="ml-2 text-[11px] bg-blue-100 text-[#0066cc] px-2 py-0.5 rounded-full font-semibold">Auto Sorter</span>
          </div>
        </div>

        {/* Google / Web Search Bar */}
        <div className="flex-1 max-w-2xl px-2">
          <div className="relative flex items-center bg-[#eaf1fb] hover:bg-[#e1eaf7] hover:shadow-sm focus-within:bg-white focus-within:shadow-md transition-all rounded-full px-4 py-2 border border-transparent">
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

        {/* Active Target Mailbox: amalnathvp@zohomail.in */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-[#dadce0] px-3.5 py-1.5 rounded-full text-xs text-[#444746] shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnectedLive ? 'bg-[#1e8e3e]' : 'bg-[#1a73e8]'} animate-pulse`} />
            <span className="text-[#5f6368]">Inbox:</span>
            <span className="font-semibold text-[#1f1f1f]">{MY_EMAIL}</span>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-medium text-[#444746] shadow-sm"
            title="Configure Zoho IMAP Password"
          >
            <Key className="w-3.5 h-3.5 text-[#0066cc]" />
            <span className="hidden sm:inline">IMAP Key</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-[#0066cc] text-white flex items-center justify-center text-sm font-bold shadow-sm">
            A
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Left Folder Sidebar */}
        <aside className="w-64 p-3 flex flex-col justify-between shrink-0 bg-[#f6f8fc] select-none">
          <div className="space-y-4">
            
            {/* Primary Action Button: Receive New Email */}
            <button
              onClick={handleReceiveEmail}
              disabled={isReceiving}
              className="w-full flex items-center justify-center space-x-2.5 bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e40af] px-5 py-3.5 rounded-2xl shadow-sm hover:shadow transition-all font-semibold text-xs disabled:opacity-50"
              title="Simulates an incoming email with PDF, JPG, Video, Audio attachments to amalnathvp@zohomail.in"
            >
              <Inbox className={`w-4 h-4 ${isReceiving ? 'animate-bounce text-[#0066cc]' : ''}`} />
              <span>{isReceiving ? 'Receiving & Sorting...' : 'Receive Incoming Mail'}</span>
            </button>

            {/* Folders List */}
            <nav className="space-y-1">
              {[
                { id: 'INBOX' as const, label: 'All Received Mails', count: emails.length, icon: <Mail className="w-4 h-4" /> },
                { id: 'PDF' as const, label: 'PDF Folder', count: pdfCount, icon: <FileText className="w-4 h-4 text-[#d93025]" /> },
                { id: 'JPG' as const, label: 'JPG / Images', count: jpgCount, icon: <ImageIcon className="w-4 h-4 text-[#9334e6]" /> },
                { id: 'VIDEO' as const, label: 'Video Folder', count: videoCount, icon: <Video className="w-4 h-4 text-[#0066cc]" /> },
                { id: 'AUDIO' as const, label: 'Audio Folder', count: audioCount, icon: <Music className="w-4 h-4 text-[#1e8e3e]" /> },
                { id: 'OTHER' as const, label: 'Other Files', count: otherCount, icon: <FolderArchive className="w-4 h-4 text-[#5f6368]" /> },
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
                        ? 'bg-[#dbeafe] text-[#1e40af] font-bold shadow-sm'
                        : 'text-[#444746] hover:bg-[#e8eaed]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-[#bfdbfe] text-[#1e40af]' : 'text-[#5f6368]'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Clean Info Box */}
          <div className="p-3 bg-white border border-[#e0e2e7] rounded-xl text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-1.5 text-[#0066cc] font-semibold text-[11px]">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Zoho Mail Auto-Sorter</span>
            </div>
            <p className="text-[11px] text-[#5f6368] leading-tight">
              Emails sent to <strong className="text-[#202124]">{MY_EMAIL}</strong> automatically have attachments organized into server folders.
            </p>
          </div>
        </aside>

        {/* 3. Main Workspace Container */}
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
                  <input type="checkbox" className="rounded text-[#0066cc] focus:ring-0 cursor-pointer" />
                  <button
                    onClick={handleRefresh}
                    disabled={isReceiving}
                    className="p-1.5 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] hover:text-[#202124] transition-colors disabled:opacity-50"
                    title="Check Zoho inbox for incoming emails"
                  >
                    <RefreshCw className={`w-4 h-4 ${isReceiving ? 'animate-spin text-[#0066cc]' : ''}`} />
                  </button>
                  <span className="text-[#80868b]">|</span>
                  <span className="font-semibold text-[#1f1f1f]">
                    {currentFolder === 'INBOX' ? 'Incoming Mails' : `${currentFolder} Folder (storage/${currentFolder.toLowerCase()}/)`}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Receive Button in Top Right */}
            {!selectedEmail && (
              <button
                onClick={handleReceiveEmail}
                disabled={isReceiving}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#eff6ff] hover:bg-[#dbeafe] text-[#0066cc] text-xs font-semibold transition-colors border border-[#bfdbfe]"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>{isReceiving ? 'Receiving...' : 'Receive Incoming Mail'}</span>
              </button>
            )}
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
              <div className="p-6 max-w-4xl space-y-6">
                <div className="border-b border-[#dadce0] pb-4">
                  <h1 className="text-xl font-medium text-[#202124] mb-3">{selectedEmail.subject || '(No Subject)'}</h1>
                  <div className="flex items-center justify-between text-xs text-[#5f6368]">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0066cc] text-white flex items-center justify-center font-semibold text-sm">
                        {selectedEmail.sender[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <span className="font-bold text-[#202124]">{selectedEmail.sender}</span>
                        <div className="text-[11px] text-[#5f6368]">to: {selectedEmail.recipient || MY_EMAIL}</div>
                      </div>
                    </div>
                    <span className="font-mono">{selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : ''}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="text-sm text-[#3c4043] leading-relaxed whitespace-pre-wrap py-2">
                  {selectedEmail.body || 'No text content.'}
                </div>

                {/* Arranged Attachments Cards */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-t border-[#dadce0] pt-4 space-y-3">
                    <h3 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                      {selectedEmail.attachments.length} Attachments Arranged into Folders:
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
                            <span className="p-2 bg-white rounded-lg border border-[#dadce0] shadow-sm">
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
              /* Inbox: List of Incoming Emails */
              loading ? (
                <div className="p-12 text-center text-xs text-[#5f6368]">Checking incoming emails...</div>
              ) : emails.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <Mail className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">No incoming emails yet</p>
                  <p className="text-xs text-[#80868b]">Click "Receive Incoming Mail" above to simulate receiving an email from a sender.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f1f3f4]">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="flex items-center px-4 py-3 hover:shadow-md hover:bg-[#f2f6fc] cursor-pointer transition-all text-xs group"
                    >
                      <div className="flex items-center space-x-3 mr-3 text-[#c4c7c5]" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-[#0066cc] focus:ring-0 cursor-pointer" />
                        <Star className="w-4 h-4 hover:text-[#f4b400] text-[#dadce0] cursor-pointer" />
                      </div>

                      <div className="w-48 font-semibold text-[#202124] truncate shrink-0">
                        {email.sender.replace(/<.*>/, '').trim() || email.sender}
                      </div>

                      <div className="flex-1 flex items-center space-x-2 truncate pr-4">
                        <span className="font-medium text-[#202124] shrink-0 truncate max-w-xs">{email.subject || '(No Subject)'}</span>
                        <span className="text-[#5f6368] truncate shrink-0">— {email.body ? email.body.slice(0, 60) : 'Deliverables'}</span>

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

                      <div className="w-20 text-right text-[11px] font-medium text-[#5f6368] font-mono shrink-0">
                        {email.received_at ? new Date(email.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Specific Folder View (PDF, JPG, Video, Audio, Other) */
              loading ? (
                <div className="p-12 text-center text-xs text-[#5f6368]">Loading files...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <FolderArchive className="w-10 h-10 text-[#dadce0] mx-auto" />
                  <p className="text-sm font-medium text-[#5f6368]">{currentFolder} folder is empty</p>
                  <p className="text-xs text-[#80868b]">Incoming {currentFolder} attachments will automatically be stored in storage/{currentFolder.toLowerCase()}/</p>
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
                          <span className="font-semibold text-[#1f1f1f] group-hover:text-[#0066cc] transition-colors truncate block">
                            {file.original_filename}
                          </span>
                          <span className="text-[11px] text-[#5f6368] truncate block">
                            Sender: {file.sender || 'External Sender'} • Size: {formatBytes(file.file_size)} • Path: {file.storage_path}
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

      {/* 4. Zoho Mail IMAP Connection Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dadce0] w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-[#0066cc]" />
                <h2 className="text-base font-bold text-[#1f2937]">Connect Zoho Mail</h2>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 hover:bg-[#f1f3f4] rounded-full text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4b5563] leading-relaxed">
              To automatically download and arrange live incoming emails to <strong className="text-black">{MY_EMAIL}</strong>, enter your Zoho Mail App Password below.
            </p>

            <form onSubmit={handleSaveZohoPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Zoho Email Address</label>
                <input
                  type="text"
                  disabled
                  value={MY_EMAIL}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Zoho IMAP Host & Port</label>
                <input
                  type="text"
                  disabled
                  value="imap.zoho.in:993 (SSL)"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Zoho App Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter your Zoho Application-Specific Password"
                  value={zohoPassword}
                  onChange={(e) => setZohoPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-[#0066cc] rounded-lg px-3 py-2 text-xs outline-none"
                />
                <p className="text-[11px] text-[#6b7280]">
                  Generate at: <a href="https://accounts.zoho.in" target="_blank" rel="noreferrer" className="text-[#0066cc] underline">accounts.zoho.in</a> &gt; Security &gt; App Passwords.
                </p>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#f1f3f4]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#0066cc] hover:bg-[#0052a3] text-white transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Save & Connect</span>
                  )}
                </button>
              </div>
            </form>
          </div>
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
