import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Key,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { EmailConfig } from '../../types';
import { api } from '../../api/client';

interface ConnectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (config: EmailConfig) => void;
  currentConfig?: EmailConfig | null;
}

export const ConnectEmailModal: React.FC<ConnectEmailModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentConfig,
}) => {
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'yahoo' | 'custom'>('gmail');
  const [host, setHost] = useState<string>('imap.gmail.com');
  const [port, setPort] = useState<number>(993);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [useSsl, setUseSsl] = useState<boolean>(true);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [interval, setInterval] = useState<number>(30);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (currentConfig) {
      setEmail(currentConfig.email_username || '');
      setHost(currentConfig.email_host || 'imap.gmail.com');
      setPort(currentConfig.email_port || 993);
      setUseSsl(currentConfig.email_use_ssl ?? true);
      setAutoPoll(currentConfig.auto_poll_enabled ?? true);
      setInterval(currentConfig.poll_interval_seconds || 30);

      if (currentConfig.email_host.includes('gmail')) setProvider('gmail');
      else if (currentConfig.email_host.includes('outlook') || currentConfig.email_host.includes('office')) setProvider('outlook');
      else if (currentConfig.email_host.includes('yahoo')) setProvider('yahoo');
      else setProvider('custom');
    }
  }, [currentConfig, isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (p: 'gmail' | 'outlook' | 'yahoo' | 'custom') => {
    setProvider(p);
    setTestResult(null);
    if (p === 'gmail') {
      setHost('imap.gmail.com');
      setPort(993);
      setUseSsl(true);
    } else if (p === 'outlook') {
      setHost('outlook.office365.com');
      setPort(993);
      setUseSsl(true);
    } else if (p === 'yahoo') {
      setHost('imap.mail.yahoo.com');
      setPort(993);
      setUseSsl(true);
    }
  };

  const handleTest = async () => {
    if (!email || !password) {
      setTestResult({ success: false, message: 'Please enter both your email address and password.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testEmailConnection({
        email_host: host,
        email_port: port,
        email_username: email.trim(),
        email_password: password.trim(),
        email_use_ssl: useSsl,
        email_folder: 'INBOX',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Failed to connect to email server.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setTestResult({ success: false, message: 'Please provide both your email address and password.' });
      return;
    }

    setSaving(true);
    try {
      const savedConfig = await api.saveEmailSettings({
        email_host: host,
        email_port: port,
        email_username: email.trim(),
        email_password: password.trim(),
        email_use_ssl: useSsl,
        email_folder: 'INBOX',
        auto_poll_enabled: autoPoll,
        poll_interval_seconds: interval,
      });
      onSaved(savedConfig);
      onClose();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Connect Email Inbox</h2>
              <p className="text-[11px] text-zinc-400">Auto-sort incoming email attachments into folders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Email Provider Selector */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">Email Provider</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'gmail', label: 'Gmail' },
                { id: 'outlook', label: 'Outlook' },
                { id: 'yahoo', label: 'Yahoo' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as any)}
                  className={`py-1.5 px-3 rounded-lg border text-center font-medium transition-all ${
                    provider === p.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="your.name@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Password / App Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-zinc-300 font-medium">
                {provider === 'gmail' ? 'Google App Password (16 chars)' : 'Password / App Password'}
              </label>
              {provider === 'gmail' && (
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <span>Get App Password</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={provider === 'gmail' ? 'xxxx xxxx xxxx xxxx' : '••••••••••••••••'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-10 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {provider === 'gmail' && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Note: Gmail requires a free 16-character App Password (not your regular account password). It takes 10 seconds to generate.
              </p>
            )}
          </div>

          {/* Custom Host/Port Settings (if custom provider) */}
          {provider === 'custom' && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1">IMAP Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200 font-mono"
                />
              </div>
            </div>
          )}

          {/* Auto-sync Options */}
          <div className="pt-2 border-t border-zinc-850 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-2 text-zinc-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">Automatic Background Sync</span>
              </div>
              <input
                type="checkbox"
                checked={autoPoll}
                onChange={(e) => setAutoPoll(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
            </label>

            {autoPoll && (
              <div className="flex items-center justify-between text-zinc-400 pl-5 text-[11px]">
                <span>Check inbox every:</span>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs font-mono"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds (Recommended)</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            )}
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-[11px] flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving || !email || !password}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 disabled:opacity-40 transition-all text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || testing || !email || !password}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs disabled:opacity-40 transition-colors shadow-sm"
              >
                {saving ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
