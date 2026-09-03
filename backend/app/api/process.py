import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.schemas.dashboard import ProcessResult, WorkerStatus
from backend.app.services.processing_service import ProcessingService
from backend.app.services.scheduler_service import scheduler
from backend.app.core.config import settings
from backend.app.core.logging import logger

router = APIRouter(prefix="/process", tags=["Processing"])

@router.post("", response_model=ProcessResult)
def trigger_processing(db: Session = Depends(get_db)):
    """
    Manually triggers email intake from the configured IMAP mailbox.
    Parses, classifies attachments, and persists metadata idempotently.
    """
    processor = ProcessingService(db=db)
    result = processor.process_inbox()
    return result

@router.get("/status", response_model=WorkerStatus)
def get_worker_status():
    """Returns background poller and IMAP connection status."""
    status = scheduler.get_status()
    return WorkerStatus(
        is_polling=status["is_polling"],
        poll_interval_seconds=status["poll_interval_seconds"],
        last_run=status["last_run"],
        imap_connected=bool(settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD),
        imap_host=settings.EMAIL_HOST or "Not configured",
        status_message=status["status_message"]
    )

@router.post("/scheduler/start")
def start_scheduler(interval_seconds: Optional[int] = None):
    """Starts the background mailbox polling worker."""
    scheduler.start(interval_seconds=interval_seconds)
    return {"status": "started", "interval_seconds": scheduler.poll_interval}

@router.post("/scheduler/stop")
def stop_scheduler():
    """Stops the background mailbox polling worker."""
    scheduler.stop()
    return {"status": "stopped"}

@router.post("/simulate", response_model=ProcessResult)
def simulate_incoming_email(
    scenario: str = "standard",
    db: Session = Depends(get_db)
):
    """
    Simulates an incoming email with realistic attachments for live demonstration and testing.
    Attachments generated include:
      - PDF: invoice.pdf (with %PDF header)
      - Image: profile.png (with PNG header)
      - Document: project_brief.docx (with PK header)
      - Spreadsheet: monthly_budget.csv (CSV text)
    """
    # Create multipart MIME email
    msg = MIMEMultipart("mixed")
    unique_id = uuid.uuid4().hex[:6]
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if scenario == "invoice":
        subject = f"Invoice #INV-{unique_id.upper()} for Services Rendered"
        sender = f"billing-{unique_id}@acme-corp.com"
    elif scenario == "report":
        subject = f"Quarterly Performance Report & Financials - Q3"
        sender = f"analytics-{unique_id}@enterprise.io"
    else:
        subject = f"Project Assets and Documents — Batch {unique_id.upper()}"
        sender = f"sarah.connor+{unique_id}@skyline-tech.com"

    recipient = settings.EMAIL_USERNAME or "inbox@fileflow.local"
    message_id = f"<simulated-{unique_id}-{int(datetime.now().timestamp())}@fileflow.demo>"

    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Message-ID"] = message_id
    msg["Date"] = email.utils.formatdate(localtime=True)

    # Body
    text_content = (
        f"Hello Team,\n\n"
        f"Please find the attached deliverables and document files for your review.\n"
        f"Generated automatically for system demonstration at {now_str}.\n\n"
        f"Included attachments:\n"
        f"1. invoice.pdf - Official Billing Invoice\n"
        f"2. photo.png - Profile banner asset\n"
        f"3. report.docx - Formal Project Specification\n"
        f"4. sales_data.csv - Transaction spreadsheet records\n\n"
        f"Best regards,\nFileFlow Demonstration Suite"
    )
    msg.attach(MIMEText(text_content, "plain", "utf-8"))

    # 1. Real PDF Attachment
    pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
        b"4 0 obj<</Length 85>>stream\n"
        b"BT\n/F1 18 Tf\n50 720 Td\n(FileFlow System Invoice - Payment Due $1,450.00) Tj\nET\nendstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000114 00000 n \n0000000216 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n353\n%%EOF\n"
    )
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=f"invoice_{unique_id}.pdf")
    msg.attach(pdf_part)

    # 2. Valid 1x1 Transparent PNG Image Attachment
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    img_part = MIMEApplication(png_bytes, _subtype="png")
    img_part.add_header("Content-Disposition", "attachment", filename=f"photo_{unique_id}.png")
    msg.attach(img_part)

    # 3. Valid Word/Office Document (.docx) Attachment
    docx_bytes = (
        b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00"
        b"word/document.xml\x00\x00"
        b"Simulated DOCX Document Content for FileFlow Assessment"
    )
    docx_part = MIMEApplication(docx_bytes, _subtype="vnd.openxmlformats-officedocument.wordprocessingml.document")
    docx_part.add_header("Content-Disposition", "attachment", filename=f"report_{unique_id}.docx")
    msg.attach(docx_part)

    # 4. CSV Spreadsheet Attachment
    csv_text = (
        "Date,Item,Category,Amount,Status\n"
        "2026-09-01,Server Hosting,Infrastructure,240.00,Paid\n"
        "2026-09-02,Domain Registration,Infrastructure,15.00,Paid\n"
        "2026-09-03,Email Service,Operations,50.00,Pending\n"
        "2026-09-04,Security Audit,Compliance,850.00,Paid\n"
    )
    csv_part = MIMEApplication(csv_text.encode("utf-8"), _subtype="csv")
    csv_part.add_header("Content-Disposition", "attachment", filename=f"sales_data_{unique_id}.csv")
    msg.attach(csv_part)

    raw_bytes = msg.as_bytes()

    # Process through orchestrator
    processor = ProcessingService(db=db)
    try:
        processed_email = processor.process_raw_email(raw_bytes)
        if processed_email:
            return ProcessResult(
                success=True,
                emails_checked=1,
                emails_processed=1,
                attachments_stored=len(processed_email.attachments),
                duplicates_skipped=0,
                errors=[],
                message=f"Simulated email '{subject}' received and processed with {len(processed_email.attachments)} attachments!"
            )
        else:
            return ProcessResult(
                success=True,
                emails_checked=1,
                emails_processed=0,
                attachments_stored=0,
                duplicates_skipped=1,
                errors=[],
                message="Duplicate simulation detected and skipped."
            )
    except Exception as e:
        logger.error(f"Error processing simulated email: {e}")
        return ProcessResult(
            success=False,
            emails_checked=1,
            emails_processed=0,
            attachments_stored=0,
            duplicates_skipped=0,
            errors=[str(e)],
            message=f"Simulation failed: {str(e)}"
        )

@router.post("/upload-eml", response_model=ProcessResult)
async def upload_eml_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Allows uploading any raw .eml file directly to process custom test emails."""
    content = await file.read()
    processor = ProcessingService(db=db)
    try:
        processed_email = processor.process_raw_email(content)
        if processed_email:
            return ProcessResult(
                success=True,
                emails_checked=1,
                emails_processed=1,
                attachments_stored=len(processed_email.attachments),
                duplicates_skipped=0,
                errors=[],
                message=f"Uploaded EML '{file.filename}' processed successfully with {len(processed_email.attachments)} attachments."
            )
        else:
            return ProcessResult(
                success=True,
                emails_checked=1,
                emails_processed=0,
                attachments_stored=0,
                duplicates_skipped=1,
                errors=[],
                message="Email in uploaded EML was already processed (duplicate Message-ID)."
            )
    except Exception as e:
        logger.error(f"Error processing uploaded EML: {e}")
        return ProcessResult(
            success=False,
            emails_checked=1,
            emails_processed=0,
            attachments_stored=0,
            duplicates_skipped=0,
            errors=[str(e)],
            message=f"Failed to process uploaded EML: {str(e)}"
        )

from pydantic import BaseModel

class MailtrapSendRequest(BaseModel):
    subject: str = "You are awesome!"
    text: str = "Congrats for sending test email with Mailtrap!"

@router.post("/mailtrap")
def send_via_mailtrap_and_sort(payload: Optional[MailtrapSendRequest] = None):
    """
    Sends email to macrovaniac1@gmail.com using Mailtrap API token,
    and automatically categorizes attachments into pdf, jpg, video, audio folders.
    """
    from backend.app.services.mailtrap_service import MailtrapService
    subj = payload.subject if payload else "You are awesome!"
    txt = payload.text if payload else "Congrats for sending test email with Mailtrap!"
    return MailtrapService.send_via_mailtrap(subject=subj, text=txt)
