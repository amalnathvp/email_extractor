from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.database.models import EmailStatus
from backend.app.schemas.attachment import AttachmentRead

class EmailBase(BaseModel):
    message_id: str
    sender: str
    recipient: Optional[str] = None
    subject: Optional[str] = None
    received_at: Optional[datetime] = None

class EmailRead(EmailBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: Optional[str] = None
    processed_at: Optional[datetime] = None
    status: EmailStatus
    error_message: Optional[str] = None
    created_at: datetime
    attachment_count: int = 0

class EmailDetail(EmailRead):
    model_config = ConfigDict(from_attributes=True)

    body_html: Optional[str] = None
    attachments: List[AttachmentRead] = []

class PaginatedEmails(BaseModel):
    items: List[EmailRead]
    total: int
    page: int
    page_size: int
    total_pages: int
