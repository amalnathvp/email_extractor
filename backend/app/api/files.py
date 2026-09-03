from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_
from backend.app.database.database import get_db
from backend.app.database.models import Attachment, Email, FileCategory
from backend.app.schemas.attachment import AttachmentRead, PaginatedAttachments
from backend.app.services.storage_service import StorageService, StorageSecurityError
from backend.app.core.logging import logger

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("", response_model=PaginatedAttachments)
def list_files(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[FileCategory] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by filename, sender, or subject"),
    mime_type: Optional[str] = Query(None, description="Filter by MIME type"),
    sort_by: str = Query("date", pattern="^(date|name|size)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Lists files with pagination, category filter, search, and sorting."""
    query = (
        db.query(Attachment, Email.sender, Email.subject, Email.received_at)
        .join(Email, Attachment.email_id == Email.id)
    )

    # Filters
    if category:
        query = query.filter(Attachment.file_category == category)
    if mime_type:
        query = query.filter(Attachment.mime_type.ilike(f"%{mime_type}%"))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Attachment.original_filename.ilike(pattern),
                Email.sender.ilike(pattern),
                Email.subject.ilike(pattern)
            )
        )

    # Count total
    total = query.count()

    # Sorting
    order_fn = desc if sort_order == "desc" else asc
    if sort_by == "name":
        query = query.order_by(order_fn(Attachment.original_filename))
    elif sort_by == "size":
        query = query.order_by(order_fn(Attachment.file_size))
    else:  # 'date'
        query = query.order_by(order_fn(Attachment.created_at))

    # Pagination
    offset = (page - 1) * page_size
    records = query.offset(offset).limit(page_size).all()

    items = []
    for att, sender, subject, received_at in records:
        att_read = AttachmentRead.model_validate(att)
        att_read.sender = sender
        att_read.subject = subject
        att_read.received_at = received_at
        items.append(att_read)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedAttachments(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{file_id}", response_model=AttachmentRead)
def get_file_metadata(file_id: int, db: Session = Depends(get_db)):
    """Fetches metadata for a single file by ID."""
    record = (
        db.query(Attachment, Email.sender, Email.subject, Email.received_at)
        .join(Email, Attachment.email_id == Email.id)
        .filter(Attachment.id == file_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="File attachment not found")

    att, sender, subject, received_at = record
    att_read = AttachmentRead.model_validate(att)
    att_read.sender = sender
    att_read.subject = subject
    att_read.received_at = received_at
    return att_read

@router.get("/{file_id}/download")
def download_file(file_id: int, db: Session = Depends(get_db)):
    """Streams file for download with appropriate Content-Disposition header."""
    att = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="File attachment not found")

    try:
        file_path = StorageService.get_absolute_path(att.storage_path)
        if file_path.is_file():
            return FileResponse(
                path=str(file_path),
                media_type=att.mime_type or "application/octet-stream",
                filename=att.original_filename,
                content_disposition_type="attachment"
            )
    except Exception:
        pass

    # Serverless fallback: serve directly from Supabase binary storage
    if att.file_data:
        return Response(
            content=bytes(att.file_data),
            media_type=att.mime_type or "application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{att.original_filename}"'}
        )

    raise HTTPException(status_code=404, detail="File content missing on storage system")

@router.get("/{file_id}/preview")
def preview_file(file_id: int, db: Session = Depends(get_db)):
    """Streams file inline for browser preview (PDFs, images, text)."""
    att = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="File attachment not found")

    try:
        file_path = StorageService.get_absolute_path(att.storage_path)
        if file_path.is_file():
            return FileResponse(
                path=str(file_path),
                media_type=att.mime_type or "application/octet-stream",
                content_disposition_type="inline"
            )
    except Exception:
        pass

    # Serverless fallback: serve directly from Supabase binary storage
    if att.file_data:
        return Response(
            content=bytes(att.file_data),
            media_type=att.mime_type or "application/octet-stream",
            headers={"Content-Disposition": f'inline; filename="{att.original_filename}"'}
        )

    raise HTTPException(status_code=404, detail="File content missing on storage system")

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    """Deletes a file attachment from disk and database."""
    att = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="File attachment not found")

    try:
        file_path = StorageService.get_absolute_path(att.storage_path)
        if file_path.is_file():
            file_path.unlink()
            logger.info(f"Deleted file from storage: {file_path}")
    except Exception as e:
        logger.warning(f"Error removing file from disk during deletion: {e}")

    db.delete(att)
    db.commit()
    return None
