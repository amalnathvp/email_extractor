from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
from backend.app.schemas.attachment import AttachmentRead

class CategoryCounts(BaseModel):
    PDF: int = 0
    IMAGE: int = 0
    DOCUMENT: int = 0
    SPREADSHEET: int = 0
    PRESENTATION: int = 0
    OTHER: int = 0

class WorkerStatus(BaseModel):
    is_polling: bool = False
    poll_interval_seconds: int = 120
    last_run: Optional[datetime] = None
    imap_connected: bool = False
    imap_host: str = ""
    status_message: str = "Ready"

class DashboardStats(BaseModel):
    total_emails: int = 0
    total_attachments: int = 0
    categories: CategoryCounts = CategoryCounts()
    processing_errors: int = 0
    total_storage_bytes: int = 0
    formatted_storage: str = "0 B"
    last_processed_at: Optional[datetime] = None
    recent_files: List[AttachmentRead] = []
    worker_status: WorkerStatus

class ProcessResult(BaseModel):
    success: bool
    emails_checked: int = 0
    emails_processed: int = 0
    attachments_stored: int = 0
    duplicates_skipped: int = 0
    errors: List[str] = []
    message: str
