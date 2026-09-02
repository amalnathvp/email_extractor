from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.database.models import FileCategory

class AttachmentBase(BaseModel):
    original_filename: str
    stored_filename: str
    mime_type: str
    file_category: FileCategory
    file_size: int
    storage_path: str

class AttachmentRead(AttachmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email_id: int
    created_at: datetime
    # Enriched fields for convenience in UI
    sender: Optional[str] = None
    subject: Optional[str] = None
    received_at: Optional[datetime] = None

class PaginatedAttachments(BaseModel):
    items: List[AttachmentRead]
    total: int
    page: int
    page_size: int
    total_pages: int
