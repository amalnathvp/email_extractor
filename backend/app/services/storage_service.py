import re
import uuid
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple
from backend.app.core.config import settings
from backend.app.core.logging import logger

class StorageSecurityError(Exception):
    """Raised when an unsafe path or filename is detected."""
    pass

class FileSizeLimitExceededError(Exception):
    """Raised when file size exceeds maximum permitted limit."""
    pass

class StorageService:
    """Service handling secure file storage, path validation, and collision-resistant naming."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitizes a filename to prevent path traversal, null-byte injection, and dangerous characters.
        Preserves safe alphanumeric characters, dots, hyphens, and underscores.
        """
        if not filename:
            return f"unnamed_{uuid.uuid4().hex[:8]}"

        # Remove null bytes and path separators
        clean = filename.replace("\x00", "").replace("/", "").replace("\\", "").strip()

        # Normalize unicode
        clean = unicodedata.normalize("NFKD", clean)

        # Remove any leading dots to prevent hidden files or relative path tricks
        clean = clean.lstrip(".")

        # Retain only safe characters: alphanumeric, dots, underscores, hyphens, spaces
        clean = re.sub(r"[^\w\s\.-]", "", clean)
        clean = re.sub(r"\s+", "_", clean).strip(" ._")

        if not clean:
            clean = f"attachment_{uuid.uuid4().hex[:8]}"

        # Enforce maximum filename length (e.g., 180 chars before extension)
        parts = clean.rsplit(".", 1)
        if len(parts) == 2:
            base, ext = parts
            base = base[:180]
            clean = f"{base}.{ext}"
        else:
            clean = clean[:180]

        return clean

    @classmethod
    def generate_stored_filename(cls, original_filename: str) -> str:
        """
        Generates a collision-resistant, unique filename while retaining original extension and base.
        Format: <safe_base>_<YYYYMMDD_HHMMSS>_<short_uuid>.<ext>
        """
        safe_name = cls.sanitize_filename(original_filename)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_token = uuid.uuid4().hex[:8]

        parts = safe_name.rsplit(".", 1)
        if len(parts) == 2:
            base, ext = parts
            return f"{base}_{timestamp}_{unique_token}.{ext}"
        return f"{safe_name}_{timestamp}_{unique_token}"

    @classmethod
    def store_file(
        cls,
        original_filename: str,
        content: bytes,
        category_subdir: str
    ) -> Tuple[str, str, int]:
        """
        Saves file content securely to the appropriate category directory.

        Returns:
            Tuple of (stored_filename, relative_storage_path, file_size)
        """
        file_size = len(content)
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise FileSizeLimitExceededError(
                f"File '{original_filename}' size ({file_size} bytes) exceeds maximum limit "
                f"({settings.MAX_FILE_SIZE_BYTES} bytes)"
            )

        stored_filename = cls.generate_stored_filename(original_filename)

        # Target directory: storage/<category_subdir>
        target_dir = (settings.STORAGE_PATH / category_subdir).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)

        target_file_path = (target_dir / stored_filename).resolve()

        # Security check: Ensure target path remains within storage root
        if not cls.is_path_safe(target_file_path):
            raise StorageSecurityError(f"Directory traversal detected for file: {stored_filename}")

        # Write file content
        with open(target_file_path, "wb") as f:
            f.write(content)

        relative_path = f"{category_subdir}/{stored_filename}"
        logger.info(f"File stored safely: '{original_filename}' -> '{relative_path}' ({file_size} bytes)")

        return stored_filename, relative_path, file_size

    @classmethod
    def is_path_safe(cls, path: Path) -> bool:
        """Verifies that the target path does not escape the configured STORAGE_PATH."""
        try:
            resolved = path.resolve()
            storage_root = settings.STORAGE_PATH.resolve()
            return storage_root in resolved.parents or resolved == storage_root
        except Exception:
            return False

    @classmethod
    def get_absolute_path(cls, relative_storage_path: str) -> Path:
        """
        Resolves a relative storage path to an absolute path, verifying path safety.
        """
        # Clean relative path
        cleaned = relative_storage_path.replace("\\", "/").strip("/")
        full_path = (settings.STORAGE_PATH / cleaned).resolve()

        if not cls.is_path_safe(full_path):
            raise StorageSecurityError(f"Attempted unsafe path traversal: {relative_storage_path}")

        return full_path

    @classmethod
    def get_storage_stats(cls) -> Tuple[int, str]:
        """Calculates total bytes stored and human-readable string."""
        total_bytes = 0
        try:
            if settings.STORAGE_PATH.exists():
                for p in settings.STORAGE_PATH.rglob("*"):
                    if p.is_file() and not p.name.endswith(".db") and not p.name.endswith(".db-wal") and not p.name.endswith(".db-shm"):
                        total_bytes += p.stat().st_size
        except Exception as e:
            logger.error(f"Error calculating storage stats: {e}")

        return total_bytes, cls.format_bytes(total_bytes)

    @staticmethod
    def format_bytes(size: int) -> str:
        """Formats byte count into human-readable representation."""
        if size <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB", "TB"]
        idx = 0
        val = float(size)
        while val >= 1024.0 and idx < len(units) - 1:
            val /= 1024.0
            idx += 1
        return f"{val:.1f} {units[idx]}"
