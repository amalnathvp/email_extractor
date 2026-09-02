import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  Filter,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Email, PaginatedResponse, EmailStatus } from '../types';
import { api } from '../api/client';

interface EmailsPageProps {
  onSelectEmail: (emailId: number) => void;
}

export const EmailsPage: React.FC<EmailsPageProps> = ({ onSelectEmail }) => {
  const [emails, setEmails] = useState<PaginatedResponse<Email> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const loadEmails = () => {
    setLoading(true);
    api.getEmails({
      page,
      page_size: pageSize,
      status: statusFilter,
      search: search.trim() || undefined,
    })
      .then((res) => {
        setEmails(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load emails:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEmails();
  }, [page, statusFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadEmails();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Emails</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Inbox records received, parsed, and logged by the processing engine
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sender, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-48 sm:w-60"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter || ''}
              onChange={(e) => {
                setStatusFilter((e.target.value as EmailStatus) || undefined);
                setPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none pr-8 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
            <Filter className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Emails Table */}
      {loading ? (
        <div className="py-24 text-center text-zinc-500 text-xs">
          Loading email records...
        </div>
      ) : !emails || emails.items.length === 0 ? (
        <div className="py-24 border border-zinc-800/80 rounded-xl bg-zinc-950/40 text-center space-y-2">
          <p className="text-zinc-400 text-sm font-medium">No emails found</p>
          <p className="text-zinc-600 text-xs">
            Trigger a manual sync or use "Simulate Email" to test the pipeline.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-950/70 border border-zinc-850 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Sender</th>
                <th className="py-3 px-4">Attachments</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/80 text-zinc-300">
              {emails.items.map((email) => (
                <tr
                  key={email.id}
                  onClick={() => onSelectEmail(email.id)}
                  className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3 max-w-md">
                      <span className="p-1.5 rounded bg-zinc-900 text-zinc-400 shrink-0">
                        <Mail className="w-4 h-4" />
                      </span>
                      <div className="truncate">
                        <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate block">
                          {email.subject || '(No Subject)'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono truncate block">
                          {email.message_id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-300 truncate max-w-xs font-medium">
                    {email.sender}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {email.attachment_count > 0 ? (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Paperclip className="w-3 h-3" />
                        <span>{email.attachment_count} files</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                    {email.received_at ? new Date(email.received_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono ${
                        email.status === 'PROCESSED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : email.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {email.status === 'PROCESSED' && <CheckCircle2 className="w-3 h-3" />}
                      {email.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                      {email.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      <span>{email.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-zinc-500 group-hover:text-zinc-200 p-1 rounded transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {emails && emails.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4 text-xs text-zinc-400">
          <span className="font-mono text-[11px]">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, emails.total)} of {emails.total} emails
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] px-2">
              Page {page} of {emails.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(emails.total_pages, p + 1))}
              disabled={page === emails.total_pages}
              className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
