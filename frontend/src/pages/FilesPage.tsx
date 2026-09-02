import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  Eye,
  Download,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Attachment, FileCategory, PaginatedResponse } from '../types';
import { api } from '../api/client';

interface FilesPageProps {
  initialCategory?: FileCategory;
  onPreviewFile: (file: Attachment) => void;
}

export const FilesPage: React.FC<FilesPageProps> = ({
  initialCategory,
  onPreviewFile,
}) => {
  const [category, setCategory] = useState<FileCategory | undefined>(initialCategory);
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const [data, setData] = useState<PaginatedResponse<Attachment> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  // Sync category state when initialCategory prop changes
  useEffect(() => {
    setCategory(initialCategory);
    setPage(1);
  }, [initialCategory]);

  const loadFiles = () => {
    setLoading(true);
    api.getFiles({
      page,
      page_size: pageSize,
      category,
      search: search.trim() || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load files:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFiles();
  }, [category, page, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadFiles();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteFile(deleteTarget.id);
      setDeleteTarget(null);
      loadFiles();
    } catch (err) {
      alert(`Delete failed: ${err}`);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
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

  const categoryOptions: { label: string; value?: FileCategory }[] = [
    { label: 'All Files', value: undefined },
    { label: 'PDFs', value: 'PDF' },
    { label: 'Images', value: 'IMAGE' },
    { label: 'Documents', value: 'DOCUMENT' },
    { label: 'Spreadsheets', value: 'SPREADSHEET' },
    { label: 'Presentations', value: 'PRESENTATION' },
    { label: 'Others', value: 'OTHER' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Files</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Browse, preview, filter, and download parsed email attachments
          </p>
        </div>

        {/* Filter Bar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search files, senders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-48 sm:w-60"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={category || ''}
              onChange={(e) => {
                setCategory((e.target.value as FileCategory) || undefined);
                setPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none pr-8 cursor-pointer"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.label} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as ['date' | 'name' | 'size', 'asc' | 'desc'];
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none pr-8 cursor-pointer font-mono"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {loading ? (
        <div className="py-24 text-center text-zinc-500 text-xs">
          Loading file records...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-24 border border-zinc-800/80 rounded-xl bg-zinc-950/40 text-center space-y-2">
          <p className="text-zinc-400 text-sm font-medium">No files found</p>
          <p className="text-zinc-600 text-xs">
            {search || category
              ? 'Try changing your search keywords or filter category.'
              : 'Click "Simulate Email" or sync your IMAP mailbox to ingest attachments.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-zinc-950/70 border border-zinc-850 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Sender</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/80 text-zinc-300">
              {data.items.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                  onClick={() => onPreviewFile(file)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3 max-w-sm">
                      <span className="p-1.5 rounded bg-zinc-900 text-zinc-400 shrink-0">
                        {getCategoryIcon(file.file_category)}
                      </span>
                      <span className="font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                        {file.original_filename}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {file.file_category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                    {formatBytes(file.file_size)}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 truncate max-w-xs">
                    {file.sender || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                    {new Date(file.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onPreviewFile(file)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={api.getFileDownloadUrl(file.id)}
                        download={file.original_filename}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setDeleteTarget(file)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((file) => (
            <div
              key={file.id}
              onClick={() => onPreviewFile(file)}
              className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform">
                  {getCategoryIcon(file.file_category)}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {file.file_category}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-zinc-200 group-hover:text-blue-400 transition-colors truncate" title={file.original_filename}>
                  {file.original_filename}
                </h3>
                <p className="text-[11px] text-zinc-500 truncate font-mono">
                  {formatBytes(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-zinc-500 text-[11px]" onClick={(e) => e.stopPropagation()}>
                <span className="truncate max-w-[140px] text-zinc-400">
                  {file.sender || 'Unknown'}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onPreviewFile(file)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={api.getFileDownloadUrl(file.id)}
                    download={file.original_filename}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4 text-xs text-zinc-400">
          <span className="font-mono text-[11px]">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total} files
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
              Page {page} of {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
              className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-zinc-100">Confirm File Deletion</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-200">{deleteTarget.original_filename}</strong>? This will remove the file from storage and the database.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
