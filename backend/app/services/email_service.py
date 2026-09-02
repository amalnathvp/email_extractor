import ssl
from typing import List, Tuple, Optional
from imapclient import IMAPClient
from backend.app.core.config import settings
from backend.app.core.logging import logger

class EmailServiceError(Exception):
    """Base exception for email service issues."""
    pass

class EmailAuthenticationError(EmailServiceError):
    """Raised when IMAP authentication fails."""
    pass

class EmailConnectionError(EmailServiceError):
    """Raised when IMAP server cannot be reached."""
    pass

class EmailService:
    """Service to connect to IMAP servers, search for new emails, and fetch raw message bytes."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_ssl: Optional[bool] = None,
        folder: Optional[str] = None
    ):
        self.host = host or settings.EMAIL_HOST
        self.port = port or settings.EMAIL_PORT
        self.username = username or settings.EMAIL_USERNAME
        self.password = password or settings.EMAIL_PASSWORD
        self.use_ssl = use_ssl if use_ssl is not None else settings.EMAIL_USE_SSL
        self.folder = folder or settings.EMAIL_FOLDER

    def _create_client(self) -> IMAPClient:
        """Creates and connects an IMAPClient instance."""
        if not self.host or not self.username:
            raise EmailConnectionError("Email host and username must be configured.")

        try:
            ssl_context = ssl.create_default_context() if self.use_ssl else None
            client = IMAPClient(
                host=self.host,
                port=self.port,
                ssl=self.use_ssl,
                ssl_context=ssl_context,
                timeout=30
            )
            return client
        except Exception as e:
            logger.error(f"Failed to connect to IMAP host {self.host}:{self.port} - {e}")
            raise EmailConnectionError(f"Connection failed: {str(e)}")

    def test_connection(self) -> Tuple[bool, str]:
        """Tests connection and authentication against the IMAP server without modifying mail."""
        if not self.username or not self.password:
            return False, "Email credentials not configured in environment."

        try:
            with self._create_client() as client:
                client.login(self.username, self.password)
                client.select_folder(self.folder, readonly=True)
                return True, f"Successfully connected to {self.host} and opened '{self.folder}'"
        except Exception as e:
            err_msg = str(e)
            logger.warning(f"IMAP test connection failed: {err_msg}")
            return False, f"Connection error: {err_msg}"

    def fetch_unprocessed_emails(
        self,
        criteria: Optional[str] = None,
        limit: Optional[int] = 50
    ) -> List[Tuple[int, bytes]]:
        """
        Connects to IMAP server, selects configured folder, searches for emails,
        and retrieves raw email RFC822 bytes.

        Returns:
            List of (message_uid, raw_email_bytes)
        """
        if not self.username or not self.password:
            logger.info("IMAP credentials empty; skipping live fetch.")
            return []

        search_criteria = criteria or settings.EMAIL_SEARCH_CRITERIA
        fetched_messages: List[Tuple[int, bytes]] = []

        try:
            with self._create_client() as client:
                try:
                    client.login(self.username, self.password)
                except Exception as e:
                    logger.error("IMAP login failed. Check EMAIL_USERNAME and EMAIL_PASSWORD.")
                    raise EmailAuthenticationError(f"Authentication failed: {e}")

                client.select_folder(self.folder, readonly=False)
                logger.info(f"Opened IMAP folder '{self.folder}', searching with criteria: '{search_criteria}'")

                # Perform search
                msg_ids = client.search([search_criteria])
                logger.info(f"Found {len(msg_ids)} emails matching '{search_criteria}'")

                if limit and len(msg_ids) > limit:
                    msg_ids = msg_ids[:limit]

                if not msg_ids:
                    return []

                # Fetch RFC822 body
                fetch_data = client.fetch(msg_ids, ["RFC822", "FLAGS"])

                for uid, data in fetch_data.items():
                    raw_bytes = data.get(b"RFC822")
                    if raw_bytes:
                        fetched_messages.append((uid, raw_bytes))

                return fetched_messages

        except (EmailConnectionError, EmailAuthenticationError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error while fetching emails: {e}")
            raise EmailServiceError(f"IMAP fetch failed: {str(e)}")

    def mark_email_seen(self, uid: int) -> None:
        """Marks an email as SEEN on the server."""
        if not settings.MARK_SEEN_ON_PROCESS or not self.username:
            return

        try:
            with self._create_client() as client:
                client.login(self.username, self.password)
                client.select_folder(self.folder, readonly=False)
                client.add_flags([uid], ["\\Seen"])
                logger.info(f"Marked email UID {uid} as \\Seen")
        except Exception as e:
            logger.warning(f"Could not mark email {uid} as seen: {e}")
