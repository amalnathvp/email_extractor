import logging
import sys
from pathlib import Path
from backend.app.core.config import DEFAULT_LOGS_DIR, IS_VERCEL

LOG_FILE = DEFAULT_LOGS_DIR / "app.log"

def setup_logging(log_level: int = logging.INFO) -> logging.Logger:
    """Configures structured logging for the application with console and rotating file output."""
    logger = logging.getLogger("email_manager")
    logger.setLevel(log_level)

    # Avoid duplicate handlers if setup_logging is called multiple times
    if logger.hasHandlers():
        logger.handlers.clear()

    # Formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    logger.addHandler(console_handler)

    # File handler (local dev only, skip on Vercel serverless)
    if not IS_VERCEL:
        try:
            DEFAULT_LOGS_DIR.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(str(LOG_FILE), encoding="utf-8")
            file_handler.setFormatter(formatter)
            file_handler.setLevel(log_level)
            logger.addHandler(file_handler)
        except Exception:
            pass

    return logger

logger = setup_logging()
