import email
from email.message import Message
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from backend.app.core.logging import logger

@dataclass
class ParsedAttachment:
    filename: str
    content: bytes
    content_type: str
    size: int

@dataclass
class ParsedEmail:
    message_id: str
    sender: str
    recipient: str
    subject: str
    body_text: str
    body_html: Optional[str]
    received_at: datetime
    attachments: List[ParsedAttachment]

class EmailParserService:
    """Service to parse RFC 822 / MIME emails and extract metadata and attachments."""

    @staticmethod
    def decode_mime_header(header_value: Optional[str]) -> str:
        """Decodes RFC 2047 encoded email headers safely."""
        if not header_value:
            return ""
        try:
            decoded_parts = decode_header(header_value)
            decoded_str = ""
            for text, charset in decoded_parts:
                if isinstance(text, bytes):
                    encoding = charset or "utf-8"
                    try:
                        decoded_str += text.decode(encoding, errors="replace")
                    except (LookupError, UnicodeDecodeError):
                        decoded_str += text.decode("utf-8", errors="replace")
                else:
                    decoded_str += str(text)
            return decoded_str.strip()
        except Exception as e:
            logger.warning(f"Header decoding error for '{header_value}': {e}")
            return str(header_value).strip()

    @staticmethod
    def parse_email_date(date_header: Optional[str]) -> datetime:
        """Parses email Date header into timezone-aware datetime."""
        if date_header:
            try:
                parsed = parsedate_to_datetime(date_header)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return parsed
            except Exception as e:
                logger.warning(f"Failed to parse email date '{date_header}': {e}")
        return datetime.now(timezone.utc)

    @classmethod
    def generate_fallback_message_id(cls, sender: str, subject: str, date_str: str) -> str:
        """Generates a deterministic message-id hash if the email lacks a Message-ID header."""
        payload = f"{sender}|{subject}|{date_str}".encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()[:24]
        return f"<generated-{digest}@fileflow.local>"

    @classmethod
    def extract_filename(cls, part: Message, index: int) -> str:
        """Extracts and decodes filename from Content-Disposition or Content-Type headers."""
        filename = part.get_filename()
        if filename:
            decoded = cls.decode_mime_header(filename)
            if decoded:
                return decoded

        # Try params in Content-Type
        content_type = part.get_param("name", header="content-type")
        if content_type:
            decoded = cls.decode_mime_header(content_type)
            if decoded:
                return decoded

        # Fallback based on content type
        maintype = part.get_content_maintype()
        subtype = part.get_content_subtype()
        ext = f".{subtype}" if subtype and subtype != "octet-stream" else ".bin"
        return f"attachment_{index}{ext}"

    @classmethod
    def parse_raw_message(cls, raw_email_bytes: bytes) -> ParsedEmail:
        """
        Parses raw bytes of an RFC 822 email message into a structured ParsedEmail object.
        """
        msg: Message = email.message_from_bytes(raw_email_bytes)

        # 1. Message-ID
        raw_msg_id = msg.get("Message-ID", "").strip()
        sender = cls.decode_mime_header(msg.get("From", "unknown@example.com"))
        recipient = cls.decode_mime_header(msg.get("To", ""))
        subject = cls.decode_mime_header(msg.get("Subject", "(No Subject)"))
        date_header = msg.get("Date", "")
        received_at = cls.parse_email_date(date_header)

        if not raw_msg_id:
            message_id = cls.generate_fallback_message_id(sender, subject, str(received_at))
            logger.info(f"Email missing Message-ID, generated deterministic ID: {message_id}")
        else:
            message_id = raw_msg_id

        # 2. Extract bodies and attachments
        body_text_parts = []
        body_html_parts = []
        attachments: List[ParsedAttachment] = []
        part_counter = 0

        for part in msg.walk():
            part_counter += 1
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))

            # Check if this part is an attachment
            filename = part.get_filename()
            is_attachment = (
                "attachment" in content_disposition.lower()
                or (filename is not None and "inline" not in content_disposition.lower())
            )

            if is_attachment:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        fname = cls.extract_filename(part, part_counter)
                        attachments.append(
                            ParsedAttachment(
                                filename=fname,
                                content=payload,
                                content_type=content_type,
                                size=len(payload)
                            )
                        )
                except Exception as e:
                    logger.error(f"Error decoding attachment part {part_counter}: {e}")
            else:
                # Part is email body text / html
                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or "utf-8"
                            body_text_parts.append(payload.decode(charset, errors="replace"))
                    except Exception as e:
                        logger.warning(f"Error decoding text body: {e}")
                elif content_type == "text/html":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or "utf-8"
                            body_html_parts.append(payload.decode(charset, errors="replace"))
                    except Exception as e:
                        logger.warning(f"Error decoding html body: {e}")
                elif filename:
                    # Some clients send inline attachments with filename
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            fname = cls.extract_filename(part, part_counter)
                            attachments.append(
                                ParsedAttachment(
                                    filename=fname,
                                    content=payload,
                                    content_type=content_type,
                                    size=len(payload)
                                )
                            )
                    except Exception as e:
                        logger.error(f"Error decoding inline attachment: {e}")

        body_text = "\n\n".join(body_text_parts).strip()
        body_html = "\n\n".join(body_html_parts).strip() if body_html_parts else None

        # Fallback body if empty
        if not body_text and body_html:
            # Minimal strip of tags for text preview
            import re
            body_text = re.sub(r"<[^>]+>", " ", body_html)
            body_text = re.sub(r"\s+", " ", body_text).strip()

        logger.info(
            f"Parsed email Message-ID: '{message_id}' | Subject: '{subject}' | "
            f"From: '{sender}' | Attachments: {len(attachments)}"
        )

        return ParsedEmail(
            message_id=message_id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            received_at=received_at,
            attachments=attachments
        )
