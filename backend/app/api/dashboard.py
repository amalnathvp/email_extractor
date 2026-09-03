from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.database.database import get_db
from backend.app.database.models import Email, Attachment, EmailStatus, FileCategory
from backend.app.schemas.dashboard import DashboardStats, CategoryCounts, WorkerStatus
from backend.app.schemas.attachment import AttachmentRead
from backend.app.services.storage_service import StorageService
from backend.app.services.scheduler_service import scheduler
from backend.app.core.config import settings, DEFAULT_LOGS_DIR

router = APIRouter(tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetches high-level metrics, category distributions, recent files, and worker state."""
    total_emails = db.query(func.count(Email.id)).scalar() or 0
    total_attachments = db.query(func.count(Attachment.id)).scalar() or 0
    processing_errors = db.query(func.count(Email.id)).filter(Email.status == EmailStatus.FAILED).scalar() or 0

    # Category counts
    category_rows = (
        db.query(Attachment.file_category, func.count(Attachment.id))
        .group_by(Attachment.file_category)
        .all()
    )
    cat_dict = {cat.value if hasattr(cat, "value") else str(cat): count for cat, count in category_rows}

    category_counts = CategoryCounts(
        PDF=cat_dict.get("PDF", 0),
        IMAGE=cat_dict.get("IMAGE", 0),
        VIDEO=cat_dict.get("VIDEO", 0),
        AUDIO=cat_dict.get("AUDIO", 0),
        DOCUMENT=cat_dict.get("DOCUMENT", 0),
        SPREADSHEET=cat_dict.get("SPREADSHEET", 0),
        PRESENTATION=cat_dict.get("PRESENTATION", 0),
        OTHER=cat_dict.get("OTHER", 0),
    )

    # Storage stats
    total_bytes, formatted_storage = StorageService.get_storage_stats()

    # Most recent processed email time
    last_email = db.query(Email.processed_at).filter(Email.processed_at != None).order_by(desc(Email.processed_at)).first()
    last_processed_at = last_email[0] if last_email else None

    # Recent files (top 6)
    recent_records = (
        db.query(Attachment, Email.sender, Email.subject, Email.received_at)
        .join(Email, Attachment.email_id == Email.id)
        .order_by(desc(Attachment.created_at))
        .limit(6)
        .all()
    )

    recent_files = []
    for att, sender, subject, received_at in recent_records:
        att_read = AttachmentRead.model_validate(att)
        att_read.sender = sender
        att_read.subject = subject
        att_read.received_at = received_at
        recent_files.append(att_read)

    # Worker status
    sched_info = scheduler.get_status()
    worker_status = WorkerStatus(
        is_polling=sched_info["is_polling"],
        poll_interval_seconds=sched_info["poll_interval_seconds"],
        last_run=sched_info["last_run"],
        imap_connected=bool(settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD),
        imap_host=settings.EMAIL_HOST or "None configured",
        status_message=sched_info["status_message"]
    )

    return DashboardStats(
        total_emails=total_emails,
        total_attachments=total_attachments,
        categories=category_counts,
        processing_errors=processing_errors,
        total_storage_bytes=total_bytes,
        formatted_storage=formatted_storage,
        last_processed_at=last_processed_at,
        recent_files=recent_files,
        worker_status=worker_status
    )

@router.get("/logs", response_model=List[str])
def get_recent_logs(limit: int = 60):
    """Returns the most recent log lines for dashboard viewing."""
    log_file = DEFAULT_LOGS_DIR / "app.log"
    if not log_file.exists():
        return ["No log records generated yet."]
    try:
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            return [line.strip() for line in lines[-limit:]]
    except Exception as e:
        return [f"Error reading log file: {e}"]
