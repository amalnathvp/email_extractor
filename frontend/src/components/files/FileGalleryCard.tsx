import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FolderArchive,
  Download,
  Trash2,
  Play,
} from 'lucide-react';
import { Attachment } from '../../types';
import { api } from '../../api/client';

interface FileGalleryCardProps {
  file: Attachment;
  onPreview: (file: Attachment) => void;
  onDelete: (id: number) => void;
  formatBytes: (bytes: number) => string;
}

export const FileGalleryCard: React.FC<FileGalleryCardProps> = ({
  file,
  onPreview,
  onDelete,
  formatBytes,
}) => {
  const [imageError, setImageError] = useState(false);
  const previewUrl = api.getFilePreviewUrl(file.id);
  const downloadUrl = api.getFileDownloadUrl(file.id);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'PDF':
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            PDF
          </span>
        );
      case 'IMAGE':
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            IMAGE
          </span>
        );
      case 'VIDEO':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            VIDEO
          </span>
        );
      case 'AUDIO':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            AUDIO
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            OTHER
          </span>
        );
    }
  };

  const renderThumbnail = () => {
    // 1. IMAGE
    if (file.file_category === 'IMAGE' && !imageError) {
      return (
        <div className="w-full h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
          <img
            src={previewUrl}
            alt={file.original_filename}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // 2. VIDEO
    if (file.file_category === 'VIDEO' || file.mime_type.startsWith('video/')) {
      return (
        <div className="w-full h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
          <video
            src={previewUrl}
            preload="metadata"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    // 3. PDF
    if (file.file_category === 'PDF') {
      return (
        <div className="w-full h-44 bg-[#fdf8f8] relative overflow-hidden flex flex-col items-center justify-center border-b border-red-100 p-4">
          <div className="w-16 h-20 bg-white rounded-lg shadow-sm border border-red-200 flex flex-col items-center justify-between p-2 relative">
            <div className="w-full flex justify-end">
              <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded">PDF</span>
            </div>
            <FileText className="w-7 h-7 text-red-500" />
            <div className="w-full space-y-1">
              <div className="h-1 bg-gray-200 rounded w-full" />
              <div className="h-1 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      );
    }

    // 4. AUDIO
    if (file.file_category === 'AUDIO' || file.mime_type.startsWith('audio/')) {
      return (
        <div className="w-full h-44 bg-[#f6fbf9] relative overflow-hidden flex flex-col items-center justify-center border-b border-emerald-100 p-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center mb-2">
            <Music className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <span className="w-1 h-3 bg-emerald-400 rounded-full" />
            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
            <span className="w-1 h-7 bg-emerald-600 rounded-full" />
            <span className="w-1 h-4 bg-emerald-500 rounded-full" />
            <span className="w-1 h-2 bg-emerald-400 rounded-full" />
          </div>
        </div>
      );
    }

    // 5. OTHER
    return (
      <div className="w-full h-44 bg-gray-50 relative overflow-hidden flex flex-col items-center justify-center border-b border-gray-200 p-4">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-2">
          <FolderArchive className="w-8 h-8 text-gray-600" />
        </div>
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
          {file.original_filename.split('.').pop() || 'FILE'}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#dadce0] shadow-sm flex flex-col overflow-hidden">
      {/* Thumbnail area (click opens preview) */}
      <div
        onClick={() => onPreview(file)}
        className="relative cursor-pointer select-none"
      >
        {renderThumbnail()}

        {/* Floating Category Badge */}
        <div className="absolute top-2.5 left-2.5">
          {getCategoryBadge(file.file_category)}
        </div>
      </div>

      {/* Card Information */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5 bg-white">
        <div>
          <h3
            onClick={() => onPreview(file)}
            className="text-xs font-bold text-gray-900 truncate hover:text-[#1a73e8] cursor-pointer"
            title={file.original_filename}
          >
            {file.original_filename}
          </h3>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {file.sender ? `From: ${file.sender.replace(/<.*>/, '').trim()}` : 'Incoming Attachment'}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="font-mono font-medium">{formatBytes(file.file_size)}</span>
          <span className="text-[10px] text-gray-400">
            {new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action Buttons: Download & Delete (No preview button, no hover effect) */}
        <div className="flex items-center justify-between pt-1 space-x-2">
          <a
            href={downloadUrl}
            download={file.original_filename}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#f1f3f4] hover:bg-[#e8eaed] text-gray-700 font-medium text-[11px] flex items-center justify-center space-x-1.5 transition-colors"
            title="Download File"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" />
            <span>Download</span>
          </a>
          <button
            type="button"
            onClick={() => onDelete(file.id)}
            className="p-1.5 rounded-lg bg-[#f1f3f4] hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
            title="Delete File"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
