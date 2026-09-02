import React from 'react';
import {
  Mail,
  Files,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  HardDrive,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  Download,
  Sparkles,
} from 'lucide-react';
import { DashboardStats, Attachment, FileCategory } from '../types';
import { api } from '../api/client';

interface OverviewPageProps {
  stats: DashboardStats | null;
  onNavigate: (view: string, category?: FileCategory) => void;
  onPreviewFile: (file: Attachment) => void;
  onSimulate: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  onNavigate,
  onPreviewFile,
  onSimulate,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
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

  const categories = [
    { id: 'PDF' as FileCategory, label: 'PDF Documents', icon: <FileText className="w-4 h-4 text-red-400" />, count: stats?.categories.PDF ?? 0, desc: 'Invoices, reports & statements' },
    { id: 'IMAGE' as FileCategory, label: 'Images & Photos', icon: <ImageIcon className="w-4 h-4 text-purple-400" />, count: stats?.categories.IMAGE ?? 0, desc: 'PNG, JPG, SVG, WebP assets' },
    { id: 'DOCUMENT' as FileCategory, label: 'Word & Text', icon: <FileCode className="w-4 h-4 text-blue-400" />, count: stats?.categories.DOCUMENT ?? 0, desc: 'DOCX, DOC, TXT briefs' },
    { id: 'SPREADSHEET' as FileCategory, label: 'Spreadsheets', icon: <Table className="w-4 h-4 text-emerald-400" />, count: stats?.categories.SPREADSHEET ?? 0, desc: 'CSV, XLSX, XLS spreadsheets' },
    { id: 'PRESENTATION' as FileCategory, label: 'Presentations', icon: <Presentation className="w-4 h-4 text-amber-400" />, count: stats?.categories.PRESENTATION ?? 0, desc: 'PPT, PPTX slide decks' },
    { id: 'OTHER' as FileCategory, label: 'Others / Archives', icon: <FolderArchive className="w-4 h-4 text-zinc-400" />, count: stats?.categories.OTHER ?? 0, desc: 'Compressed & generic binaries' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Email intake, automatic file classification & storage overview
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onSimulate}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Incoming Email</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Emails */}
        <div
          onClick={() => onNavigate('emails')}
          className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-zinc-900/80 group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Emails Ingested</span>
            <Mail className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats?.total_emails ?? 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center space-x-1">
            <span>Processed idempotently</span>
          </p>
        </div>

        {/* Processed Files */}
        <div
          onClick={() => onNavigate('files')}
          className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-zinc-900/80 group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Classified Files</span>
            <Files className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats?.total_attachments ?? 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Across 6 category stores
          </p>
        </div>

        {/* Storage Size */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Storage</span>
            <HardDrive className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats?.formatted_storage ?? '0 B'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Local filesystem storage
          </p>
        </div>

        {/* Errors / Health */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Processing Health</span>
            <AlertCircle className={`w-4 h-4 ${stats?.processing_errors ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats?.processing_errors ? `${stats.processing_errors} Errors` : '100% OK'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats?.processing_errors ? 'Attention needed' : 'Zero unhandled faults'}
          </p>
        </div>
      </div>

      {/* Category Distribution Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Category Breakdown
          </h2>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
          >
            <span>View all files</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('files', cat.id)}
              className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer transition-all flex items-start justify-between group"
            >
              <div className="flex items-start space-x-3">
                <span className="p-2 rounded-md bg-zinc-900 border border-zinc-800 shrink-0">
                  {cat.icon}
                </span>
                <div>
                  <h3 className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{cat.desc}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-zinc-300 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Files Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recent Files
          </h2>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
          >
            <span>Open file browser</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-zinc-950/70 border border-zinc-850 rounded-xl overflow-hidden shadow-sm">
          {stats?.recent_files && stats.recent_files.length > 0 ? (
            <div className="divide-y divide-zinc-850/80">
              {stats.recent_files.map((file) => (
                <div
                  key={file.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-zinc-900/40 transition-colors text-xs"
                >
                  <div
                    onClick={() => onPreviewFile(file)}
                    className="flex items-center space-x-3 cursor-pointer overflow-hidden max-w-md group"
                  >
                    <span className="p-1.5 rounded bg-zinc-900 text-zinc-400 shrink-0">
                      {getCategoryIcon(file.file_category)}
                    </span>
                    <div className="truncate">
                      <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate block">
                        {file.original_filename}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        From: {file.sender || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-zinc-400 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {file.file_category}
                    </span>
                    <span className="w-16 text-right">{formatBytes(file.file_size)}</span>
                    <span className="w-24 text-right text-zinc-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>

                    {/* Quick actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onPreviewFile(file)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Preview File"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={api.getFileDownloadUrl(file.id)}
                        download={file.original_filename}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 text-xs space-y-3">
              <p>No files processed yet.</p>
              <button
                onClick={onSimulate}
                className="px-3 py-1.5 rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs inline-flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Simulate Demo Email</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
