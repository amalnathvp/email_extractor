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

    recipient = settings.TARGET_EMAIL or "macrovaniac1@gmail.com"
    message_id = f"<incoming-{unique_id}-{int(datetime.now().timestamp())}@sender-domain.com>"

    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Message-ID"] = message_id
    msg["Date"] = email.utils.formatdate(localtime=True)

    # Body
    text_content = (
        f"Hi {recipient.split('@')[0]},\n\n"
        f"Sending over the deliverables for our project as requested.\n"
        f"All files have been attached for your review:\n\n"
        f"• contract_{unique_id}.pdf (PDF Document)\n"
        f"• photo_{unique_id}.jpg (High-Res Image)\n"
        f"• video_demo_{unique_id}.mp4 (Project Video)\n"
        f"• voice_note_{unique_id}.mp3 (Audio Voice Brief)\n\n"
        f"Received at: {now_str}\n"
        f"Sender: {sender}"
    )
    msg.attach(MIMEText(text_content, "plain", "utf-8"))

    # 1. Real PDF Attachment
    pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
        b"4 0 obj<</Length 85>>stream\n"
        b"BT\n/F1 18 Tf\n50 720 Td\n(Official Deliverable Contract - Ready for Processing) Tj\nET\nendstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000114 00000 n \n0000000216 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n353\n%%EOF\n"
    )
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=f"contract_{unique_id}.pdf")
    msg.attach(pdf_part)

    # 2. Valid JPEG Image Attachment
    jpg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
        0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
        0x00, 0xBF, 0x80, 0xFF, 0xD9
    ])
    img_part = MIMEApplication(jpg_bytes, _subtype="jpeg")
    img_part.add_header("Content-Disposition", "attachment", filename=f"photo_{unique_id}.jpg")
    msg.attach(img_part)

    # 3. Valid MP4 Video Attachment
    video_bytes = (
        b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42\x00\x00\x00\x08free"
        b"\x00\x00\x00\x28mdatSample Video Stream Captured from Email Flow Attachment Data"
    )
    video_part = MIMEApplication(video_bytes, _subtype="mp4")
    video_part.add_header("Content-Disposition", "attachment", filename=f"video_demo_{unique_id}.mp4")
    msg.attach(video_part)

    # 4. Valid MP3 Audio Attachment
    audio_bytes = (
        b"ID3\x03\x00\x00\x00\x00\x00#TIT2\x00\x00\x00\x17\x00\x00\x00Sample Voice Note"
        b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    )
    audio_part = MIMEApplication(audio_bytes, _subtype="mpeg")
    audio_part.add_header("Content-Disposition", "attachment", filename=f"voice_note_{unique_id}.mp3")
    msg.attach(audio_part)

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


