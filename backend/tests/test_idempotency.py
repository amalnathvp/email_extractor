import pytest
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from backend.app.services.processing_service import ProcessingService
from backend.app.database.models import Email, Attachment, EmailStatus

def create_sample_email(message_id: str, filename: str = "doc.pdf") -> bytes:
    msg = MIMEMultipart("mixed")
    msg["From"] = "client@example.com"
    msg["To"] = "company@example.com"
    msg["Subject"] = "Quarterly Statement"
    msg["Message-ID"] = message_id
    msg["Date"] = "Wed, 02 Sep 2026 10:00:00 +0000"

    msg.attach(MIMEText("Please find attachment.", "plain"))

    part = MIMEApplication(b"%PDF-1.4 dummy", _subtype="pdf")
    part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(part)
    return msg.as_bytes()

def test_idempotent_processing(db_session):
    raw_email = create_sample_email("<unique-msg-999@example.com>")
    processor = ProcessingService(db=db_session)

    # First run
    email1 = processor.process_raw_email(raw_email)
    assert email1 is not None
    assert email1.status == EmailStatus.PROCESSED
    assert len(email1.attachments) == 1

    # Second run with same raw email (same Message-ID)
    email2 = processor.process_raw_email(raw_email)
    assert email2 is None  # Skipped as duplicate!

    # Verify only 1 email in DB
    total_emails = db_session.query(Email).count()
    assert total_emails == 1

    total_attachments = db_session.query(Attachment).count()
    assert total_attachments == 1
