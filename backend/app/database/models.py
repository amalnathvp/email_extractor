import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    Index
)
from sqlalchemy.orm import relationship
from backend.app.database.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

class FileCategory(str, enum.Enum):
    PDF = "PDF"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    DOCUMENT = "DOCUMENT"
    SPREADSHEET = "SPREADSHEET"
    PRESENTATION = "PRESENTATION"
    OTHER = "OTHER"

class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message_id = Column(String(512), unique=True, index=True, nullable=False)
    sender = Column(String(255), index=True, nullable=False)
    recipient = Column(String(255), nullable=True)
    subject = Column(String(512), nullable=True, default="(No Subject)")
    body = Column(Text, nullable=True)  # Plain text body
    body_html = Column(Text, nullable=True)  # Raw HTML body if present
    received_at = Column(DateTime(timezone=True), nullable=True, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationship to attachments
    attachments = relationship(
        "Attachment",
        back_populates="email",
        cascade="all, delete-orphan",
        order_by="Attachment.id"
    )

    def __repr__(self):
        return f"<Email id={self.id} message_id='{self.message_id}' subject='{self.subject}'>"


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email_id = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(512), nullable=False)
    stored_filename = Column(String(512), unique=True, nullable=False, index=True)
    mime_type = Column(String(128), nullable=False, index=True)
    file_category = Column(SQLEnum(FileCategory), nullable=False, index=True)
    file_size = Column(Integer, nullable=False)  # in bytes
    storage_path = Column(String(1024), nullable=False)  # relative path within storage root
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    # Back reference to Email
    email = relationship("Email", back_populates="attachments")

    def __repr__(self):
        return f"<Attachment id={self.id} filename='{self.original_filename}' category='{self.file_category}'>"
