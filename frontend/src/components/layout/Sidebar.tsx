import React from 'react';
import {
  LayoutDashboard,
  Files,
  Mail,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  Settings,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { FileCategory, CategoryCounts } from '../../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, category?: FileCategory) => void;
  selectedCategory?: FileCategory;
  categoryCounts?: CategoryCounts;
  isSyncing: boolean;
  onSync: () => void;
  onSimulate: () => void;
  imapConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  selectedCategory,
  categoryCounts,
  isSyncing,
  onSync,
  onSimulate,
  imapConnected,
}) => {
  const categories: { id: FileCategory; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'PDF', label: 'PDFs', icon: <FileText className="w-4 h-4 text-red-400" />, count: categoryCounts?.PDF ?? 0 },
    { id: 'IMAGE', label: 'Images', icon: <ImageIcon className="w-4 h-4 text-purple-400" />, count: categoryCounts?.IMAGE ?? 0 },
    { id: 'DOCUMENT', label: 'Documents', icon: <FileCode className="w-4 h-4 text-blue-400" />, count: categoryCounts?.DOCUMENT ?? 0 },
    { id: 'SPREADSHEET', label: 'Spreadsheets', icon: <Table className="w-4 h-4 text-emerald-400" />, count: categoryCounts?.SPREADSHEET ?? 0 },
    { id: 'PRESENTATION', label: 'Presentations', icon: <Presentation className="w-4 h-4 text-amber-400" />, count: categoryCounts?.PRESENTATION ?? 0 },
    { id: 'OTHER', label: 'Others', icon: <FolderArchive className="w-4 h-4 text-zinc-400" />, count: categoryCounts?.OTHER ?? 0 },
  ];

  return (
    <aside className="w-64 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col justify-between h-screen select-none shrink-0">
      {/* Top Brand Header */}
      <div>
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100">FileFlow</span>
              <span className="block text-[10px] text-zinc-500 font-mono tracking-wider">EMAIL PROCESSOR</span>
            </div>
          </div>
          <span className="text-[11px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono">
            v1.0
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="p-3 space-y-1">
          <button
            onClick={() => onNavigate('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              currentView === 'overview'
                ? 'bg-zinc-800/80 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('files')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              currentView === 'files' && !selectedCategory
                ? 'bg-zinc-800/80 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Files className="w-4 h-4" />
              <span>All Files</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('emails')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              currentView === 'emails'
                ? 'bg-zinc-800/80 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4" />
              <span>Emails</span>
            </div>
          </button>
        </div>

        {/* Categories Section */}
        <div className="px-3 pt-3">
          <div className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Categories
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isSelected = currentView === 'files' && selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onNavigate('files', cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-zinc-800/90 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-900/80">
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Actions & Settings */}
      <div className="p-3 border-t border-zinc-800/60 space-y-2">
        {/* Quick Action: Simulate Demo Email */}
        <button
          onClick={onSimulate}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-medium bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all shadow-sm"
          title="Generates a simulated email with PDF, Image, Word & CSV attachments for instant interview demonstration"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Simulate Email (Demo)</span>
        </button>

        {/* Sync Mailbox Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Mailbox'}</span>
        </button>

        {/* Settings & Connection status */}
        <div className="flex items-center justify-between pt-1 px-1">
          <button
            onClick={() => onNavigate('settings')}
            className={`flex items-center space-x-1.5 text-xs ${
              currentView === 'settings' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <div className="flex items-center space-x-1.5" title={imapConnected ? "IMAP Configured" : "IMAP Not Configured (Demo Mode Available)"}>
            <span className={`w-2 h-2 rounded-full ${imapConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[10px] text-zinc-500 font-mono">
              {imapConnected ? 'IMAP' : 'Demo'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
