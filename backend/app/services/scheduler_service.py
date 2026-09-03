import asyncio
from datetime import datetime, timezone
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.database import SessionLocal
from backend.app.schemas.dashboard import ProcessResult
from backend.app.services.processing_service import ProcessingService

class SchedulerService:
    """Manages background polling tasks for automated inbox checks."""

    def __init__(self):
        self.is_running: bool = False
        self._task: Optional[asyncio.Task] = None
        self.last_run: Optional[datetime] = None
        self.last_status: str = "Idle"
        self.poll_interval: int = settings.POLL_INTERVAL_SECONDS

    async def _poll_loop(self):
        logger.info(f"Background email poller started. Interval: {self.poll_interval}s")
        self.is_running = True
        self.last_status = "Running"

        while self.is_running:
            try:
                self.last_run = datetime.now(timezone.utc)
                self.last_status = "Polling inbox..."
                logger.info("Executing scheduled mailbox poll...")

                # Run in threadpool since IMAP / DB is synchronous
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, self._run_sync_process)

                self.last_status = f"Completed: {result.message}"
                logger.info(f"Scheduled poll complete: {result.message}")

            except asyncio.CancelledError:
                logger.info("Background poller task cancelled.")
                break
            except Exception as e:
                self.last_status = f"Error during poll: {str(e)}"
                logger.error(f"Error in background poll loop: {e}", exc_info=True)

            try:
                await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break

        self.is_running = False
        self.last_status = "Stopped"
        logger.info("Background poller terminated.")

    def _run_sync_process(self):
        """Worker function executed in thread pool."""
        if SessionLocal is None:
            return ProcessResult(
                success=False,
                message="Supabase DATABASE_URL not configured. Waiting for connection string..."
            )
        db = None
        try:
            db = SessionLocal()
            processor = ProcessingService(db=db)
            return processor.process_inbox()
        except Exception as e:
            logger.warning(f"Polling paused: {e}")
            return ProcessResult(
                success=False,
                message=f"Awaiting valid Supabase connection: {e}"
            )
        finally:
            if db is not None:
                db.close()

    def start(self, interval_seconds: Optional[int] = None):
        """Starts background polling task."""
        if interval_seconds:
            self.poll_interval = interval_seconds
        if self.is_running:
            return

        self.is_running = True
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._poll_loop())
            logger.info("Initiated background poller task.")
        except RuntimeError:
            # If no running event loop is available, record state without raising
            logger.info("No running event loop available for background task.")

    def stop(self):
        """Stops background polling task."""
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Stopped background poller task.")

    def get_status(self) -> dict:
        return {
            "is_polling": self.is_running,
            "poll_interval_seconds": self.poll_interval,
            "last_run": self.last_run,
            "status_message": self.last_status
        }

scheduler = SchedulerService()
