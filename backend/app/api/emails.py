import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from backend.app.database.database import get_db
from backend.app.database.models import Email, Attachment, EmailStatus
from backend.app.schemas.email import EmailRead, EmailDetail, PaginatedEmails
from backend.app.schemas.attachment import AttachmentRead

from backend.app.core.config import settings
from backend.app.core.logging import logger

router = APIRouter(prefix="/emails", tags=["Emails"])

_last_sync_time: float = 0.0

class BatchDeleteEmailsRequest(BaseModel):
    email_ids: List[int]

@router.get("", response_model=PaginatedEmails)
def list_emails(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[EmailStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search sender, recipient, or subject"),
    sync: bool = Query(False, description="Sync incoming emails from mailbox (cached)"),
    force: bool = Query(False, description="Force immediate IMAP sync from mailbox"),
    db: Session = Depends(get_db)
):
    """Retrieves paginated list of processed emails with attachment counts.
    Returns fast database query by default. Checks mailbox only when requested or needed."""
    global _last_sync_time
    now = time.time()
    should_sync = (force or (sync and (now - _last_sync_time > 60))) and settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD

    if should_sync:
        _last_sync_time = now
        try:
            from backend.app.services.processing_service import ProcessingService
            processor = ProcessingService(db=db)
            processor.process_inbox()
        except Exception as e:
            logger.warning(f"On-demand inbox intake notice: {e}")

    # Subquery for attachment count
    att_count_subq = (
        db.query(Attachment.email_id, func.count(Attachment.id).label("att_count"))
        .group_by(Attachment.email_id)
        .subquery()
    )

    query = (
        db.query(Email, func.coalesce(att_count_subq.c.att_count, 0).label("attachment_count"))
        .outerjoin(att_count_subq, Email.id == att_count_subq.c.email_id)
    )

    if status:
        query = query.filter(Email.status == status)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Email.sender.ilike(pattern),
                Email.recipient.ilike(pattern),
                Email.subject.ilike(pattern),
                Email.body.ilike(pattern)
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(desc(Email.received_at)).offset(offset).limit(page_size).all()

    items = []
    for email_record, count in records:
        e_read = EmailRead.model_validate(email_record)
        e_read.attachment_count = count
        items.append(e_read)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedEmails(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("/batch-delete")
@router.post("/batch")
@router.delete("/batch-delete")
@router.delete("/batch")
def batch_delete_emails(payload: BatchDeleteEmailsRequest, db: Session = Depends(get_db)):
    """Deletes multiple emails and their attachments directly in a single SQL query."""
    if not payload.email_ids:
        return {"deleted": 0}

    # Delete child attachments in bulk directly without loading large binary blobs
    db.query(Attachment).filter(Attachment.email_id.in_(payload.email_ids)).delete(synchronize_session=False)
    deleted_count = (
        db.query(Email)
        .filter(Email.id.in_(payload.email_ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    logger.info(f"Batch deleted {deleted_count} emails (IDs: {payload.email_ids})")
    return {"deleted": deleted_count}

@router.get("/{email_id}", response_model=EmailDetail)
def get_email_details(email_id: int, db: Session = Depends(get_db)):
    """Retrieves detailed email content, full body, and associated attachments."""
    email_record = db.query(Email).filter(Email.id == email_id).first()
    if not email_record:
        raise HTTPException(status_code=404, detail="Email record not found")

    detail = EmailDetail.model_validate(email_record)
    detail.attachment_count = len(email_record.attachments)

    # Attachments with sender/subject convenience
    att_items = []
    for att in email_record.attachments:
        a_read = AttachmentRead.model_validate(att)
        a_read.sender = email_record.sender
        a_read.subject = email_record.subject
        a_read.received_at = email_record.received_at
        att_items.append(a_read)

    detail.attachments = att_items
    return detail

@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/{email_id}/delete", status_code=status.HTTP_200_OK)
def delete_single_email(email_id: int, db: Session = Depends(get_db)):
    """Fast-deletes a single email and all its attachments without loading binary data."""
    # Delete child attachments directly via SQL without fetching blob data
    db.query(Attachment).filter(Attachment.email_id == email_id).delete(synchronize_session=False)
    deleted_count = db.query(Email).filter(Email.id == email_id).delete(synchronize_session=False)
    if not deleted_count:
        raise HTTPException(status_code=404, detail="Email record not found")

    db.commit()
    logger.info(f"Deleted email {email_id}")
    return {"deleted": True, "id": email_id}


