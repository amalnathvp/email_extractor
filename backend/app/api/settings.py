from pathlib import Path
from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, Depends
from backend.app.core.config import settings, BACKEND_DIR
from backend.app.services.email_service import EmailService, EmailConnectionError, EmailAuthenticationError
from backend.app.services.scheduler_service import scheduler
from backend.app.core.logging import logger

router = APIRouter(prefix="/settings", tags=["Settings"])

class EmailConfigInput(BaseModel):
    email_host: str = "imap.gmail.com"
    email_port: int = 993
    email_username: str
    email_password: str
    email_use_ssl: bool = True
    email_folder: str = "INBOX"
    auto_poll_enabled: bool = True
    poll_interval_seconds: int = 30

class EmailConfigResponse(BaseModel):
    email_host: str
    email_port: int
    email_username: str
    email_use_ssl: bool
    email_folder: str
    is_connected: bool
    auto_poll_enabled: bool
    poll_interval_seconds: int
    status_message: str

class TestConnectionInput(BaseModel):
    email_host: str = "imap.gmail.com"
    email_port: int = 993
    email_username: str
    email_password: str
    email_use_ssl: bool = True
    email_folder: str = "INBOX"

class TestConnectionResponse(BaseModel):
    success: bool
    message: str

@router.get("/email", response_model=EmailConfigResponse)
def get_email_settings():
    """Returns current email configuration status with password masked."""
    status_msg = "Not configured"
    is_connected = False

    if settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD:
        status_msg = f"Configured for {settings.EMAIL_USERNAME}"
        is_connected = True

    return EmailConfigResponse(
        email_host=settings.EMAIL_HOST,
        email_port=settings.EMAIL_PORT,
        email_username=settings.EMAIL_USERNAME,
        email_use_ssl=settings.EMAIL_USE_SSL,
        email_folder=settings.EMAIL_FOLDER,
        is_connected=is_connected,
        auto_poll_enabled=scheduler.is_running,
        poll_interval_seconds=scheduler.poll_interval,
        status_message=status_msg
    )

@router.post("/test", response_model=TestConnectionResponse)
def test_email_connection(payload: TestConnectionInput):
    """Tests IMAP credentials against the mail server without saving."""
    if not payload.email_username or not payload.email_password:
        return TestConnectionResponse(
            success=False,
            message="Email username and password are required."
        )

    try:
        service = EmailService(
            host=payload.email_host,
            port=payload.email_port,
            username=payload.email_username,
            password=payload.email_password,
            use_ssl=payload.email_use_ssl,
            folder=payload.email_folder
        )
        success, msg = service.test_connection()
        return TestConnectionResponse(success=success, message=msg)
    except Exception as e:
        err = str(e)
        if "Authentication failed" in err or "LOGIN failed" in err or "NO" in err:
            err = (
                "Authentication failed. If using Gmail, make sure you are using a 16-character "
                "Google App Password (myaccount.google.com/apppasswords), NOT your regular account password."
            )
        return TestConnectionResponse(success=False, message=err)

@router.post("/email", response_model=EmailConfigResponse)
async def save_email_settings(payload: EmailConfigInput):
    """
    Validates IMAP credentials, saves them to backend/.env, updates runtime settings,
    and starts automated background inbox polling.
    """
    # 1. Test credentials first
    service = EmailService(
        host=payload.email_host,
        port=payload.email_port,
        username=payload.email_username,
        password=payload.email_password,
        use_ssl=payload.email_use_ssl,
        folder=payload.email_folder
    )
    success, msg = service.test_connection()
    if not success:
        if "Authentication failed" in msg or "LOGIN" in msg:
            msg = (
                "Authentication failed. If using Gmail, please create a 16-character App Password at: "
                "https://myaccount.google.com/apppasswords and use it as your password."
            )
        raise HTTPException(status_code=400, detail=msg)

    # 2. Update active runtime settings
    settings.EMAIL_HOST = payload.email_host
    settings.EMAIL_PORT = payload.email_port
    settings.EMAIL_USERNAME = payload.email_username
    settings.EMAIL_PASSWORD = payload.email_password
    settings.EMAIL_USE_SSL = payload.email_use_ssl
    settings.EMAIL_FOLDER = payload.email_folder
    settings.AUTO_POLL_ENABLED = payload.auto_poll_enabled
    settings.POLL_INTERVAL_SECONDS = payload.poll_interval_seconds

    # 3. Persist to backend/.env file
    env_path = BACKEND_DIR / ".env"
    env_content = (
        f'PROJECT_NAME="{settings.PROJECT_NAME}"\n'
        f'DEBUG={str(settings.DEBUG).lower()}\n\n'
        f'EMAIL_HOST={payload.email_host}\n'
        f'EMAIL_PORT={payload.email_port}\n'
        f'EMAIL_USERNAME={payload.email_username}\n'
        f'EMAIL_PASSWORD={payload.email_password}\n'
        f'EMAIL_USE_SSL={str(payload.email_use_ssl).lower()}\n'
        f'EMAIL_FOLDER={payload.email_folder}\n'
        f'EMAIL_SEARCH_CRITERIA={settings.EMAIL_SEARCH_CRITERIA}\n'
        f'MARK_SEEN_ON_PROCESS={str(settings.MARK_SEEN_ON_PROCESS).lower()}\n\n'
        f'DATABASE_URL={settings.DATABASE_URL}\n'
        f'STORAGE_PATH={settings.STORAGE_PATH}\n'
        f'MAX_FILE_SIZE_BYTES={settings.MAX_FILE_SIZE_BYTES}\n\n'
        f'AUTO_POLL_ENABLED={str(payload.auto_poll_enabled).lower()}\n'
        f'POLL_INTERVAL_SECONDS={payload.poll_interval_seconds}\n'
    )
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(env_content)
        logger.info(f"Updated .env with credentials for {payload.email_username}")
    except Exception as e:
        logger.warning(f"Failed to persist .env file: {e}")

    # 4. Manage background poller
    if payload.auto_poll_enabled:
        if scheduler.is_running:
            scheduler.stop()
        scheduler.start(interval_seconds=payload.poll_interval_seconds)
        logger.info(f"Started auto-poller for {payload.email_username} every {payload.poll_interval_seconds}s")
    else:
        if scheduler.is_running:
            scheduler.stop()

    return EmailConfigResponse(
        email_host=settings.EMAIL_HOST,
        email_port=settings.EMAIL_PORT,
        email_username=settings.EMAIL_USERNAME,
        email_use_ssl=settings.EMAIL_USE_SSL,
        email_folder=settings.EMAIL_FOLDER,
        is_connected=True,
        auto_poll_enabled=scheduler.is_running,
        poll_interval_seconds=scheduler.poll_interval,
        status_message=f"Connected to {payload.email_username} (Auto-syncing every {payload.poll_interval_seconds}s)"
    )

@router.post("/auto-sync")
async def toggle_auto_sync(enabled: bool, interval_seconds: Optional[int] = None):
    """Enables or disables continuous background inbox polling."""
    interval = interval_seconds or settings.POLL_INTERVAL_SECONDS
    if enabled:
        scheduler.start(interval_seconds=interval)
        msg = f"Auto-sync enabled (checking every {interval} seconds)"
    else:
        scheduler.stop()
        msg = "Auto-sync disabled (manual sync only)"

    return {
        "auto_poll_enabled": scheduler.is_running,
        "poll_interval_seconds": scheduler.poll_interval,
        "message": msg
    }
