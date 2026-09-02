import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import uuid
from datetime import datetime, timezone

from backend.app.database.database import SessionLocal, Base, engine
from backend.app.services.processing_service import ProcessingService
from backend.app.database.models import EmailStatus

def main():
    print("=" * 60)
    print("  FileFlow - Standalone Email Ingestion Demonstration")
    print("=" * 60)

    # Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create test email
        msg = MIMEMultipart("mixed")
        unique_id = uuid.uuid4().hex[:6]
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        subject = f"Interview Assessment Deliverables - #{unique_id.upper()}"
        sender = f"applicant.{unique_id}@talent-hire.com"
        recipient = "interviewer@enterprise.io"
        message_id = f"<interview-demo-{unique_id}@fileflow.local>"

        msg["From"] = sender
        msg["To"] = recipient
        msg["Subject"] = subject
        msg["Message-ID"] = message_id
        msg["Date"] = email.utils.formatdate(localtime=True)

        body_text = (
            f"Dear Assessment Committee,\n\n"
            f"Please find attached the requested files for the Email File Manager technical assessment:\n"
            f"1. invoice.pdf - Standard Billing Invoice\n"
            f"2. photo.png - Profile Snapshot\n"
            f"3. report.docx - System Architecture Summary\n"
            f"4. sales_data.csv - Metric Log Table\n\n"
            f"Generated at: {now_str}\n\n"
            f"Sincerely,\nCandidate"
        )
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        # Real PDF
        pdf_bytes = (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
            b"4 0 obj<</Length 70>>stream\nBT\n/F1 18 Tf\n50 720 Td\n(Invoice #INV-2026 - $2,500.00) Tj\nET\nendstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000114 00000 n \n0000000216 00000 n \n"
            b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n338\n%%EOF\n"
        )
        p1 = MIMEApplication(pdf_bytes, _subtype="pdf")
        p1.add_header("Content-Disposition", "attachment", filename=f"invoice_{unique_id}.pdf")
        msg.attach(p1)

        # PNG Image
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
            b"\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        p2 = MIMEApplication(png_bytes, _subtype="png")
        p2.add_header("Content-Disposition", "attachment", filename=f"photo_{unique_id}.png")
        msg.attach(p2)

        # DOCX
        docx_bytes = b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00word/document.xml\x00\x00Demo DOCX Document"
        p3 = MIMEApplication(docx_bytes, _subtype="vnd.openxmlformats-officedocument.wordprocessingml.document")
        p3.add_header("Content-Disposition", "attachment", filename=f"report_{unique_id}.docx")
        msg.attach(p3)

        # CSV
        csv_text = "Metric,Value,Status\nEmails,120,Active\nFiles,340,Stored\nUptime,99.9%,Healthy\n"
        p4 = MIMEApplication(csv_text.encode("utf-8"), _subtype="csv")
        p4.add_header("Content-Disposition", "attachment", filename=f"sales_data_{unique_id}.csv")
        msg.attach(p4)

        raw_bytes = msg.as_bytes()
        print(f"\n[+] Generated RFC 822 Email:")
        print(f"    - Message-ID: {message_id}")
        print(f"    - From:       {sender}")
        print(f"    - Subject:    {subject}")
        print(f"    - Size:       {len(raw_bytes)} bytes")
        print(f"    - Attachments: 4 files (PDF, PNG, DOCX, CSV)")

        print("\n[+] Processing email through FileFlow pipeline...")
        processor = ProcessingService(db=db)
        email_record = processor.process_raw_email(raw_bytes)

        if email_record:
            print(f"\n[SUCCESS] Email ingested with ID: {email_record.id}")
            print(f"          Status: {email_record.status.value}")
            print("\n[+] Saved Attachments:")
            for att in email_record.attachments:
                print(f"    - [{att.file_category.value:12}] {att.original_filename:20} -> {att.storage_path} ({att.file_size} bytes)")
        else:
            print("\n[INFO] Email was recognized as a duplicate and safely skipped.")

        print("\n" + "=" * 60)
        print("  Demonstration completed successfully.")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    main()
