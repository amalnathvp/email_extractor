export type FileCategory =
  | 'PDF'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'OTHER';

export type EmailStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface Attachment {
  id: number;
  email_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_category: FileCategory;
  file_size: number;
  storage_path: string;
  created_at: string;
  sender?: string;
  subject?: string;
  received_at?: string;
}

export interface Email {
  id: number;
  message_id: string;
  sender: string;
  recipient?: string;
  subject: string;
  body?: string;
  received_at?: string;
  processed_at?: string;
  status: EmailStatus;
  error_message?: string;
  created_at: string;
  attachment_count: number;
  attachments?: Attachment[];
}

export interface EmailDetail extends Email {
  body_html?: string;
  attachments: Attachment[];
}

export interface CategoryCounts {
  PDF: number;
  IMAGE: number;
  DOCUMENT: number;
  SPREADSHEET: number;
  PRESENTATION: number;
  OTHER: number;
}

export interface WorkerStatus {
  is_polling: boolean;
  poll_interval_seconds: number;
  last_run?: string;
  imap_connected: boolean;
  imap_host: string;
  status_message: string;
}

export interface EmailConfig {
  email_host: string;
  email_port: number;
  email_username: string;
  email_use_ssl: boolean;
  email_folder: string;
  is_connected: boolean;
  auto_poll_enabled: boolean;
  poll_interval_seconds: number;
  status_message: string;
}

export interface DashboardStats {
  total_emails: number;
  total_attachments: number;
  categories: CategoryCounts;
  processing_errors: number;
  total_storage_bytes: number;
  formatted_storage: string;
  last_processed_at?: string;
  recent_files: Attachment[];
  worker_status: WorkerStatus;
}

export interface ProcessResult {
  success: boolean;
  emails_checked: number;
  emails_processed: number;
  attachments_stored: number;
  duplicates_skipped: number;
  errors: string[];
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
