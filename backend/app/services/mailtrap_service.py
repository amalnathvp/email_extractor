import io
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from email.message import EmailMessage
import mailtrap as mt

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.database import SessionLocal
from backend.app.services.processing_service import ProcessingService

class MailtrapService:
    """Service to send emails via Mailtrap API and automatically categorize attachments."""

    @classmethod
    def get_sample_attachments(cls) -> List[Dict[str, Any]]:
        """Generates sample attachments for PDF, JPG, Video, and Audio."""
        # 1. Minimal valid PDF bytes
        pdf_bytes = (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
        )

        # 2. Minimal valid 1x1 JPEG bytes
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

        # 3. Minimal valid MP4 video container header bytes
        video_bytes = (
            b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42\x00\x00\x00\x08free"
            b"\x00\x00\x00\x28mdatSample Video Stream Captured from Email Flow Attachment Data"
        )

        # 4. Minimal valid MP3 audio header bytes
        audio_bytes = (
            b"ID3\x03\x00\x00\x00\x00\x00#TIT2\x00\x00\x00\x17\x00\x00\x00Sample Voice Note"
            b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        )

        return [
            {"filename": "contract_document.pdf", "content": pdf_bytes, "mimetype": "application/pdf"},
            {"filename": "profile_image.jpg", "content": jpg_bytes, "mimetype": "image/jpeg"},
            {"filename": "project_demo.mp4", "content": video_bytes, "mimetype": "video/mp4"},
            {"filename": "voice_message.mp3", "content": audio_bytes, "mimetype": "audio/mpeg"},
        ]

    @classmethod
    def send_via_mailtrap(
        cls,
        subject: str = "You are awesome!",
        text: str = "Congrats for sending test email with Mailtrap!",
        recipient: Optional[str] = None,
        include_attachments: bool = True
    ) -> Dict[str, Any]:
        """
        Sends email via MailtrapClient using user's token and hardcoded recipient,
        then automatically categorizes the attachments into pdf, jpg, video, audio folders.
        """
        target_email = recipient or settings.TARGET_EMAIL
        attachments_meta = cls.get_sample_attachments() if include_attachments else []

        # 1. Prepare Mailtrap Attachments (Mailtrap expects base64 encoded bytes)
        mt_attachments = []
        for att in attachments_meta:
            mt_attachments.append(
                mt.Attachment(
                    content=base64.b64encode(att["content"]),
                    filename=att["filename"],
                    mimetype=att["mimetype"]
                )
            )

        # 2. Build Mail Object (using exact user snippet structure)
        mail = mt.Mail(
            sender=mt.Address(email=settings.MAILTRAP_SENDER, name="Mailtrap Test"),
            to=[mt.Address(email=target_email)],
            subject=subject,
            text=text,
            category="Automatic File Sorter",
            attachments=mt_attachments if mt_attachments else None
        )

        # 3. Send using MailtrapClient
        send_result = None
        try:
            client = mt.MailtrapClient(token=settings.MAILTRAP_TOKEN)
            send_result = client.send(mail)
            logger.info(f"Successfully dispatched Mailtrap email to {target_email}: {send_result}")
        except Exception as e:
            logger.error(f"Mailtrap send API call error: {e}")
            send_result = {"error": str(e), "success": False}

        # 4. Ingest and sort into folders automatically
        db = SessionLocal()
        try:
            # Build standard RFC 822 MIME message so our parser processes it identically
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = f"Mailtrap Test <{settings.MAILTRAP_SENDER}>"
            msg["To"] = target_email
            msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
            msg["Message-ID"] = f"<mailtrap-{uuid.uuid4().hex[:12]}@demomailtrap.co>"
            msg.set_content(text)

            for att in attachments_meta:
                maintype, subtype = att["mimetype"].split("/", 1)
                msg.add_attachment(
                    att["content"],
                    maintype=maintype,
                    subtype=subtype,
                    filename=att["filename"]
                )

            processor = ProcessingService(db=db)
            raw_bytes = msg.as_bytes()
            email_record = processor.process_raw_email(raw_bytes)

            stored_summary = []
            if email_record:
                for a in email_record.attachments:
                    stored_summary.append({
                        "filename": a.original_filename,
                        "category": a.file_category,
                        "path": a.storage_path
                    })

            return {
                "success": True,
                "recipient": target_email,
                "mailtrap_response": send_result,
                "message": f"Sent email to {target_email} and automatically sorted {len(stored_summary)} files.",
                "files_sorted": stored_summary
            }
        finally:
            db.close()
