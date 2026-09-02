import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Clock,
  Terminal,
  RefreshCw,
  Play,
  Square,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { WorkerStatus } from '../types';
import { api } from '../api/client';

interface SettingsPageProps {
  workerStatus?: WorkerStatus;
  onRefreshStats: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  workerStatus,
  onRefreshStats,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [intervalSecs, setIntervalSecs] = useState<number>(120);
  const [isTogglingWorker, setIsTogglingWorker] = useState<boolean>(false);

  const loadLogs = () => {
    setLoadingLogs(true);
    api.getLogs()
      .then((lines) => {
        setLogs(lines);
        setLoadingLogs(false);
      })
      .catch((err) => {
        console.error('Failed to load logs:', err);
        setLoadingLogs(false);
      });
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleToggleScheduler = async () => {
    setIsTogglingWorker(true);
    try {
      if (workerStatus?.is_polling) {
        await api.stopScheduler();
      } else {
        await api.startScheduler(intervalSecs);
      }
      onRefreshStats();
      loadLogs();
    } catch (err) {
      alert(`Worker control error: ${err}`);
    } finally {
      setIsTogglingWorker(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">System & Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure IMAP connections, background polling workers, and inspect structured runtime logs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IMAP Server Card */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-850 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center space-x-2.5">
              <Server className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Email Server (IMAP)</h2>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center space-x-1.5 ${
                workerStatus?.imap_connected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${workerStatus?.imap_connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{workerStatus?.imap_connected ? 'Configured' : 'Credentials Unset (Demo Ready)'}</span>
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>IMAP Host:</span>
              <span className="font-mono text-zinc-200">{workerStatus?.imap_host || 'imap.gmail.com'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>SSL / Port:</span>
              <span className="font-mono text-zinc-200">SSL Enabled (993)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>Folder Scanned:</span>
              <span className="font-mono text-zinc-200">INBOX</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>Search Criteria:</span>
              <span className="font-mono text-zinc-200">UNSEEN (New Emails Only)</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            To configure a live Gmail or Outlook inbox, set <code className="text-zinc-400">EMAIL_USERNAME</code> and <code className="text-zinc-400">EMAIL_PASSWORD</code> in <code className="text-zinc-400">backend/.env</code>.
          </p>
        </div>

        {/* Background Polling Worker Card */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-850 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Automated Poller (Worker)</h2>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                workerStatus?.is_polling
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {workerStatus?.is_polling ? 'Active / Polling' : 'Stopped / Manual'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Poll Frequency:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={intervalSecs}
                  onChange={(e) => setIntervalSecs(Number(e.target.value))}
                  disabled={workerStatus?.is_polling}
                  className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-right focus:outline-none focus:border-zinc-700 disabled:opacity-50"
                />
                <span className="text-zinc-500">seconds</span>
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>Last Execution:</span>
              <span className="font-mono text-zinc-300">
                {workerStatus?.last_run ? new Date(workerStatus.last_run).toLocaleTimeString() : 'Not yet polled'}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleToggleScheduler}
                disabled={isTogglingWorker}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  workerStatus?.is_polling
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {workerStatus?.is_polling ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Auto-Poller</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Auto-Poller</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Storage Architecture Card */}
      <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-850 space-y-3 shadow-sm">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-zinc-850">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Security & Safe Storage Guarantees</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/60 space-y-1">
            <span className="font-medium text-zinc-200 block">Path Traversal Protection</span>
            <p className="text-[11px] text-zinc-500">
              Filenames sanitized of <code className="text-zinc-400">../</code>, null bytes, and path separators. File target strictly sandboxed inside storage root.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/60 space-y-1">
            <span className="font-medium text-zinc-200 block">Collision-Resistant Naming</span>
            <p className="text-[11px] text-zinc-500">
              Files named with safe base, timestamp, and UUID tokens. Original filename safely retained in database record.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/60 space-y-1">
            <span className="font-medium text-zinc-200 block">Idempotent Processing</span>
            <p className="text-[11px] text-zinc-500">
              Emails deduplicated on RFC 822 <code className="text-zinc-400">Message-ID</code> with atomic database transactions preventing duplicate processing.
            </p>
          </div>
        </div>
      </div>

      {/* Runtime Structured Logs Viewer */}
      <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-850 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Live Application Logs</h2>
          </div>
          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="h-64 bg-black/90 border border-zinc-900 rounded-lg p-3 font-mono text-[11px] text-zinc-300 overflow-y-auto space-y-1">
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} className="leading-tight break-all font-mono">
                {log.includes('ERROR') ? (
                  <span className="text-red-400">{log}</span>
                ) : log.includes('WARNING') ? (
                  <span className="text-amber-400">{log}</span>
                ) : log.includes('Classified') ? (
                  <span className="text-purple-300">{log}</span>
                ) : log.includes('stored safely') ? (
                  <span className="text-emerald-300">{log}</span>
                ) : (
                  <span className="text-zinc-400">{log}</span>
                )}
              </div>
            ))
          ) : (
            <div className="text-zinc-600">No logs loaded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
