import {
  DashboardStats,
  PaginatedResponse,
  Attachment,
  Email,
  EmailDetail,
  ProcessResult,
  FileCategory,
  WorkerStatus,
  EmailConfig,
} from '../types';

const BASE_URL = '/api';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  // Check if response has content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

export const api = {
  // Dashboard
  getStats: () => fetchApi<DashboardStats>('/stats'),
  getLogs: () => fetchApi<string[]>('/logs'),

  // Files
  getFiles: (params: {
    page?: number;
    page_size?: number;
    category?: FileCategory;
    search?: string;
    mime_type?: string;
    sort_by?: 'date' | 'name' | 'size';
    sort_order?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.mime_type) query.append('mime_type', params.mime_type);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);

    return fetchApi<PaginatedResponse<Attachment>>(`/files?${query.toString()}`);
  },

  getFileMetadata: (id: number) => fetchApi<Attachment>(`/files/${id}`),
  getFilePreviewUrl: (id: number) => `${BASE_URL}/files/${id}/preview`,
  getFileDownloadUrl: (id: number) => `${BASE_URL}/files/${id}/download`,
  deleteFile: (id: number) => fetchApi<void>(`/files/${id}`, { method: 'DELETE' }),

  // Emails
  getEmails: (params: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    return fetchApi<PaginatedResponse<Email>>(`/emails?${query.toString()}`);
  },

  getEmailDetails: (id: number) => fetchApi<EmailDetail>(`/emails/${id}`),

  // Process & Simulation
  triggerProcess: () => fetchApi<ProcessResult>('/process', { method: 'POST' }),
  sendViaMailtrap: (subject?: string, text?: string) =>
    fetchApi<{ success: boolean; message: string; files_sorted: any[] }>('/process/mailtrap', {
      method: 'POST',
      body: JSON.stringify({
        subject: subject || 'You are awesome!',
        text: text || 'Congrats for sending test email with Mailtrap!',
      }),
    }),
  simulateEmail: (scenario: string = 'standard') =>
    fetchApi<ProcessResult>(`/process/simulate?scenario=${scenario}`, { method: 'POST' }),
  getWorkerStatus: () => fetchApi<WorkerStatus>('/process/status'),
  startScheduler: (intervalSeconds?: number) => {
    const url = intervalSeconds
      ? `/process/scheduler/start?interval_seconds=${intervalSeconds}`
      : '/process/scheduler/start';
    return fetchApi<{ status: string; interval_seconds: number }>(url, { method: 'POST' });
  },
  stopScheduler: () => fetchApi<{ status: string }>('/process/scheduler/stop', { method: 'POST' }),

  // Email Settings & Auto-Sync
  getEmailSettings: () => fetchApi<EmailConfig>('/settings/email'),
  testEmailConnection: (data: {
    email_host: string;
    email_port: number;
    email_username: string;
    email_password: string;
    email_use_ssl: boolean;
    email_folder: string;
  }) => fetchApi<{ success: boolean; message: string }>('/settings/test', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  saveEmailSettings: (data: {
    email_host: string;
    email_port: number;
    email_username: string;
    email_password: string;
    email_use_ssl: boolean;
    email_folder: string;
    auto_poll_enabled: boolean;
    poll_interval_seconds: number;
  }) => fetchApi<EmailConfig>('/settings/email', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  toggleAutoSync: (enabled: boolean, intervalSeconds?: number) => {
    const url = intervalSeconds
      ? `/settings/auto-sync?enabled=${enabled}&interval_seconds=${intervalSeconds}`
      : `/settings/auto-sync?enabled=${enabled}`;
    return fetchApi<{ auto_poll_enabled: boolean; poll_interval_seconds: number; message: string }>(url, {
      method: 'POST',
    });
  },
};
