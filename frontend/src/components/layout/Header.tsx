import React from 'react';
import { Search, Bell, Sparkles, RefreshCw, Activity } from 'lucide-react';
import { WorkerStatus } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  workerStatus?: WorkerStatus;
  onSync: () => void;
  onSimulate: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  workerStatus,
  onSync,
  onSimulate,
  isSyncing,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
          <span>{title}</span>
          {subtitle && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-xs font-normal text-zinc-400">{subtitle}</span>
            </>
          )}
        </h1>
      </div>

      {/* Right controls: Worker status & Sync / Simulation */}
      <div className="flex items-center space-x-3">
        {/* Worker status pill */}
        {workerStatus && (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Activity className={`w-3 h-3 ${workerStatus.is_polling ? 'text-emerald-400 animate-spin' : 'text-zinc-500'}`} />
            <span className="text-[11px] font-mono">
              {workerStatus.is_polling ? `Polling (${workerStatus.poll_interval_seconds}s)` : 'Manual Sync'}
            </span>
          </div>
        )}

        {/* Simulate button */}
        <button
          onClick={onSimulate}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-colors"
          title="Simulates incoming email with 4 realistic attachments"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate Email</span>
        </button>

        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
};
