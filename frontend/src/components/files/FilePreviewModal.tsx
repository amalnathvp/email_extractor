import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  FileCode,
  Table,
  Presentation,
  FolderArchive,
  ExternalLink,
  Calendar,
  User,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import { Attachment } from '../../types';
import { api } from '../../api/client';

interface FilePreviewModalProps {
  file: Attachment | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<boolean>(false);

  useEffect(() => {
    if (!file) {
      setTextContent(null);
      return;
    }

    // If file is text, csv, or markdown, fetch its text content to preview inline
    const isTextBased =
      file.file_category === 'SPREADSHEET' && file.original_filename.endsWith('.csv') ||
      file.file_category === 'DOCUMENT' && (file.original_filename.endsWith('.txt') || file.original_filename.endsWith('.md')) ||
      file.mime_type.startsWith('text/');

    if (isTextBased) {
      setLoadingText(true);
      fetch(api.getFilePreviewUrl(file.id))
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('Failed to load text preview.');
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
      setLoadingText(false);
    }
  }, [file]);

  if (!file) return null;

  const previewUrl = api.getFilePreviewUrl(file.id);
  const downloadUrl = api.getFileDownloadUrl(file.id);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderPreviewContent = () => {
    // 1. PDF Preview
    if (file.file_category === 'PDF') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
          <iframe
            src={previewUrl}
            title={file.original_filename}
            className="w-full h-[55vh] sm:h-[620px] rounded-lg border-0"
          />
        </div>
      );
    }

    // 2. Image Preview
    if (file.file_category === 'IMAGE') {
      return (
        <div className="w-full h-[50vh] sm:h-[520px] flex items-center justify-center bg-zinc-950/80 rounded-lg p-2 sm:p-4 border border-zinc-800/80">
          <img
            src={previewUrl}
            alt={file.original_filename}
            className="max-h-full max-w-full object-contain rounded shadow-lg"
          />
        </div>
      );
    }

    // 2b. Video Preview
    if (file.file_category === 'VIDEO' || file.mime_type.startsWith('video/')) {
      return (
        <div className="w-full h-[45vh] sm:h-[520px] flex items-center justify-center bg-zinc-950/90 rounded-lg p-2 sm:p-4 border border-zinc-800/80">
          <video
            controls
            autoPlay
            src={previewUrl}
            className="max-h-full max-w-full rounded shadow-xl"
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // 2c. Audio Preview
    if (file.file_category === 'AUDIO' || file.mime_type.startsWith('audio/')) {
      return (
        <div className="w-full h-[240px] sm:h-[300px] flex flex-col items-center justify-center bg-zinc-950/90 rounded-lg p-4 sm:p-8 border border-zinc-800/80 space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xl">
            🎵
          </div>
          <audio controls autoPlay src={previewUrl} className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // 3. Text / CSV Preview
    if (textContent !== null) {
      return (
        <div className="w-full h-[50vh] sm:h-[520px] bg-zinc-950 rounded-lg p-3 sm:p-4 border border-zinc-800/80 overflow-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {loadingText ? (
            <div className="flex items-center justify-center h-full text-zinc-500">Loading preview...</div>
          ) : (
            textContent
          )}
        </div>
      );
    }

    // 4. Unsupported File Fallback (Office docx/xlsx/pptx or other binaries)
    return (
      <div className="w-full h-[320px] sm:h-[400px] flex flex-col items-center justify-center bg-zinc-950/60 rounded-lg border border-zinc-800/80 p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          {file.file_category === 'DOCUMENT' && <FileCode className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />}
          {file.file_category === 'SPREADSHEET' && <Table className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />}
          {file.file_category === 'PRESENTATION' && <Presentation className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />}
          {file.file_category === 'OTHER' && <FolderArchive className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-400" />}
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-200">File Preview Unavailable</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            Browser inline preview is not supported for {file.mime_type || 'this file type'}. Download the file to view it in its native application.
          </p>
        </div>
        <a
          href={downloadUrl}
          download={file.original_filename}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Download File</span>
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#121215] border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden min-w-0">
            <span className="p-1.5 sm:p-2 rounded-md bg-zinc-800 text-zinc-300 shrink-0">
              {file.file_category === 'PDF' && <FileText className="w-4 h-4 text-red-400" />}
              {file.file_category === 'IMAGE' && <ImageIcon className="w-4 h-4 text-purple-400" />}
              {file.file_category === 'DOCUMENT' && <FileCode className="w-4 h-4 text-blue-400" />}
              {file.file_category === 'SPREADSHEET' && <Table className="w-4 h-4 text-emerald-400" />}
              {file.file_category === 'PRESENTATION' && <Presentation className="w-4 h-4 text-amber-400" />}
              {file.file_category === 'OTHER' && <FolderArchive className="w-4 h-4 text-zinc-400" />}
            </span>
            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">{file.original_filename}</h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono truncate">
                {file.file_category} • {formatBytes(file.file_size)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <a
              href={downloadUrl}
              download={file.original_filename}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Preview Area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-[#0d0d10]">
          {renderPreviewContent()}
        </div>

        {/* Footer: Metadata details */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-zinc-800/80 bg-zinc-900/40 text-[11px] sm:text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 font-mono">
          <div className="flex items-center space-x-3 truncate">
            {file.sender && (
              <span className="flex items-center space-x-1.5 truncate" title={`Sender: ${file.sender}`}>
                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300 font-sans truncate">{file.sender}</span>
              </span>
            )}
            {file.subject && (
              <span className="hidden sm:inline-flex items-center space-x-1.5 truncate max-w-xs text-zinc-400 font-sans">
                <span>Re: {file.subject}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-[10px] sm:text-[11px] text-zinc-500 shrink-0">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
