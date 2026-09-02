import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  User,
  Calendar,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
} from 'lucide-react';
import { EmailDetail, Attachment } from '../../types';
import { api } from '../../api/client';

interface EmailDetailDrawerProps {
  emailId: number | null;
  onClose: () => void;
  onPreviewAttachment: (att: Attachment) => void;
}

export const EmailDetailDrawer: React.FC<EmailDetailDrawerProps> = ({
  emailId,
  onClose,
  onPreviewAttachment,
}) => {
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'html'>('text');

  useEffect(() => {
    if (!emailId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    api.getEmailDetails(emailId)
      .then((res) => {
        setDetail(res);
        if (!res.body && res.body_html) {
          setActiveTab('html');
        } else {
          setActiveTab('text');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch email details');
        setLoading(false);
      });
  }, [emailId]);

  if (!emailId) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#101014] border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Email Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Loading email information...
          </div>
        ) : error || !detail ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-6 text-center">
            {error || 'Email record not found'}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Subject and Status */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-lg font-semibold text-zinc-100 leading-snug">
                  {detail.subject || '(No Subject)'}
                </h1>
                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                    detail.status === 'PROCESSED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : detail.status === 'FAILED'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {detail.status === 'PROCESSED' && <CheckCircle2 className="w-3 h-3" />}
                  {detail.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                  {detail.status === 'PENDING' && <Clock className="w-3 h-3" />}
                  <span>{detail.status}</span>
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500 truncate" title={detail.message_id}>
                ID: {detail.message_id}
              </p>
            </div>

            {/* Sender / Recipient / Date Metadata Grid */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-zinc-400">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500">From:</span>
                  <span className="text-zinc-200 font-medium">{detail.sender}</span>
                </div>
                {detail.received_at && (
                  <div className="flex items-center space-x-1.5 text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(detail.received_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {detail.recipient && (
                <div className="flex items-center space-x-2 text-zinc-400">
                  <span className="text-zinc-500 ml-5">To:</span>
                  <span className="text-zinc-300">{detail.recipient}</span>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            {detail.attachments && detail.attachments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  <span>Attachments ({detail.attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {detail.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => onPreviewAttachment(att)}
                      className="group flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer transition-all"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <span className="p-1.5 rounded bg-zinc-900 text-zinc-400 group-hover:text-zinc-200">
                          {getCategoryIcon(att.file_category)}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-blue-400 transition-colors">
                            {att.original_filename}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {att.file_category} • {formatBytes(att.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="p-1 rounded text-zinc-400 hover:text-zinc-200">
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Body Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Message Body
                </span>
                {detail.body_html && detail.body && (
                  <div className="flex space-x-1 bg-zinc-900 rounded p-0.5 border border-zinc-800 text-[11px]">
                    <button
                      onClick={() => setActiveTab('text')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        activeTab === 'text' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Plain Text
                    </button>
                    <button
                      onClick={() => setActiveTab('html')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        activeTab === 'html' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      HTML View
                    </button>
                  </div>
                )}
              </div>

              {activeTab === 'text' ? (
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-4 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {detail.body || '(No text content)'}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto text-zinc-900">
                  <div
                    dangerouslySetInnerHTML={{ __html: detail.body_html || '' }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              )}
            </div>

            {/* Error Message Display if failed */}
            {detail.error_message && (
              <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 space-y-1">
                <span className="font-semibold block">Processing Failure Log:</span>
                <p className="font-mono text-[11px]">{detail.error_message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
