from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Email, Attachment, EmailStatus
from backend.app.services.email_service import EmailService, EmailServiceError
from backend.app.services.parser_service import EmailParserService, ParsedEmail
from backend.app.services.classification_service import ClassificationService
from backend.app.services.storage_service import StorageService, StorageSecurityError, FileSizeLimitExceededError
from backend.app.schemas.dashboard import ProcessResult
from backend.app.core.logging import logger
from backend.app.core.config import settings

class ProcessingService:
    """Core orchestrator that handles idempotent email processing, attachment classification, and persistence."""

    def __init__(self, db: Session, email_service: Optional[EmailService] = None):
        self.db = db
        self.email_service = email_service or EmailService()

    def process_raw_email(self, raw_email_bytes: bytes, email_uid: Optional[int] = None) -> Optional[Email]:
        """
        Processes a single raw email with strict idempotency and transaction safety.
        Returns the Email record or None if duplicate.
        """
        # 1. Parse raw message
        parsed: ParsedEmail = EmailParserService.parse_raw_message(raw_email_bytes)

        # 2. Idempotency Check: Verify if message_id exists in database
        existing = self.db.query(Email).filter(Email.message_id == parsed.message_id).first()
        if existing:
            logger.info(f"Duplicate email skipped: Message-ID '{parsed.message_id}' already processed (ID={existing.id})")
            return None

        # 3. Create Email DB record in PENDING status
        email_record = Email(
            message_id=parsed.message_id,
            sender=parsed.sender,
            recipient=parsed.recipient,
            subject=parsed.subject,
            body=parsed.body_text,
            body_html=parsed.body_html,
            received_at=parsed.received_at,
            status=EmailStatus.PENDING,
        )
        self.db.add(email_record)
        self.db.flush()  # Obtain email_record.id

        created_file_paths: List[Path] = []

        try:
            # 4. Extract, classify, and store each attachment
            for att in parsed.attachments:
                # Classify
                category, validated_mime, subdir = ClassificationService.classify(
                    filename=att.filename,
                    content=att.content,
                    declared_mime=att.content_type
                )

                # Store file securely
                stored_filename, relative_path, file_size = StorageService.store_file(
                    original_filename=att.filename,
                    content=att.content,
                    category_subdir=subdir
                )
                created_file_paths.append(settings.STORAGE_PATH / relative_path)

                # Create DB attachment record
                db_att = Attachment(
                    email_id=email_record.id,
                    original_filename=att.filename,
                    stored_filename=stored_filename,
                    mime_type=validated_mime,
                    file_category=category,
                    file_size=file_size,
                    storage_path=relative_path
                )
                self.db.add(db_att)

            # 5. Mark email PROCESSED
            email_record.status = EmailStatus.PROCESSED
            email_record.processed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(email_record)

            logger.info(
                f"Successfully processed email {email_record.id} with {len(email_record.attachments)} attachments."
            )

            # Mark seen on IMAP if UID provided
            if email_uid is not None:
                self.email_service.mark_email_seen(email_uid)

            return email_record

        except Exception as e:
            logger.error(f"Error processing email '{parsed.message_id}': {e}", exc_info=True)
            self.db.rollback()

            # Clean up any files written during this failed transaction
            for file_path in created_file_paths:
                try:
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Cleaned up orphaned file after failure: {file_path}")
                except Exception as cleanup_err:
                    logger.warning(f"Failed to cleanup orphaned file {file_path}: {cleanup_err}")

            # Record failed email status in a fresh transaction
            try:
                failed_record = Email(
                    message_id=parsed.message_id,
                    sender=parsed.sender,
                    recipient=parsed.recipient,
                    subject=parsed.subject,
                    body=parsed.body_text,
                    body_html=parsed.body_html,
                    received_at=parsed.received_at,
                    status=EmailStatus.FAILED,
                    error_message=str(e)[:1000]
                )
                self.db.add(failed_record)
                self.db.commit()
            except Exception as rec_err:
                self.db.rollback()
                logger.error(f"Could not record failed email entry: {rec_err}")

            raise

    def process_inbox(self) -> ProcessResult:
        """
        Connects to IMAP, pulls unread/configured emails, and runs processing.
        """
        result = ProcessResult(
            success=True,
            emails_checked=0,
            emails_processed=0,
            attachments_stored=0,
            duplicates_skipped=0,
            errors=[],
            message=""
        )

        try:
            emails_data = self.email_service.fetch_unprocessed_emails()
            result.emails_checked = len(emails_data)

            for uid, raw_bytes in emails_data:
                try:
                    processed_email = self.process_raw_email(raw_bytes, email_uid=uid)
                    if processed_email:
                        result.emails_processed += 1
                        result.attachments_stored += len(processed_email.attachments)
                    else:
                        result.duplicates_skipped += 1
                except Exception as e:
                    err = f"Failed to process email UID {uid}: {str(e)}"
                    result.errors.append(err)
                    logger.error(err)

            if result.errors:
                result.success = False
                result.message = f"Processed {result.emails_processed} emails with {len(result.errors)} errors."
            else:
                result.message = (
                    f"Processed {result.emails_processed} new emails, "
                    f"stored {result.attachments_stored} attachments, "
                    f"skipped {result.duplicates_skipped} duplicates."
                )

        except EmailServiceError as e:
            result.success = False
            result.errors.append(str(e))
            result.message = f"Email service error: {str(e)}"
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
            result.message = f"Unexpected processing error: {str(e)}"

        return result
