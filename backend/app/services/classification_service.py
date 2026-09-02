import mimetypes
from pathlib import Path
from typing import Tuple
from backend.app.database.models import FileCategory
from backend.app.core.logging import logger

# Ensure standard mimetypes are registered
mimetypes.init()
mimetypes.add_type("application/pdf", ".pdf")
mimetypes.add_type("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx")
mimetypes.add_type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx")
mimetypes.add_type("application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx")
mimetypes.add_type("text/csv", ".csv")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/svg+xml", ".svg")

# Extension to category mappings
EXTENSION_CATEGORIES = {
    # PDF
    ".pdf": FileCategory.PDF,
    
    # Images
    ".jpg": FileCategory.IMAGE,
    ".jpeg": FileCategory.IMAGE,
    ".png": FileCategory.IMAGE,
    ".gif": FileCategory.IMAGE,
    ".webp": FileCategory.IMAGE,
    ".bmp": FileCategory.IMAGE,
    ".svg": FileCategory.IMAGE,
    
    # Documents
    ".doc": FileCategory.DOCUMENT,
    ".docx": FileCategory.DOCUMENT,
    ".txt": FileCategory.DOCUMENT,
    ".rtf": FileCategory.DOCUMENT,
    ".md": FileCategory.DOCUMENT,
    
    # Spreadsheets
    ".xls": FileCategory.SPREADSHEET,
    ".xlsx": FileCategory.SPREADSHEET,
    ".csv": FileCategory.SPREADSHEET,
    ".tsv": FileCategory.SPREADSHEET,
    
    # Presentations
    ".ppt": FileCategory.PRESENTATION,
    ".pptx": FileCategory.PRESENTATION,
}

# Subdirectory folder mapping for each category
CATEGORY_SUBDIRS = {
    FileCategory.PDF: "pdf",
    FileCategory.IMAGE: "images",
    FileCategory.DOCUMENT: "documents",
    FileCategory.SPREADSHEET: "spreadsheets",
    FileCategory.PRESENTATION: "presentations",
    FileCategory.OTHER: "others",
}

class ClassificationService:
    """Multi-layer classification engine validating MIME types, extensions, and magic byte signatures."""

    @staticmethod
    def inspect_magic_bytes(content: bytes) -> str | None:
        """Inspects file binary headers to identify known file signatures without external C dependencies."""
        if not content:
            return None
        
        # PDF: %PDF-
        if content.startswith(b"%PDF-"):
            return "application/pdf"
        
        # PNG: \x89PNG\r\n\x1a\n
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        
        # JPEG: \xff\xd8\xff
        if content.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        
        # GIF: GIF87a or GIF89a
        if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
            return "image/gif"
        
        # WebP: RIFF....WEBP
        if len(content) > 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            return "image/webp"
        
        # BMP: BM
        if content.startswith(b"BM"):
            return "image/bmp"
        
        # ZIP-based Office OpenXML (.docx, .xlsx, .pptx)
        if content.startswith(b"PK\x03\x04"):
            return "application/zip"
        
        # SVG detection (XML with <svg tag)
        try:
            head = content[:512].decode("utf-8", errors="ignore").lower()
            if "<svg" in head:
                return "image/svg+xml"
        except Exception:
            pass

        return None

    @classmethod
    def classify(
        cls,
        filename: str,
        content: bytes,
        declared_mime: str | None = None
    ) -> Tuple[FileCategory, str, str]:
        """
        Classifies an attachment by inspecting declared MIME, filename extension, and binary magic bytes.
        
        Returns:
            Tuple of (FileCategory, validated_mime_type, subdirectory_name)
        """
        ext = Path(filename).suffix.lower()
        magic_mime = cls.inspect_magic_bytes(content)

        # Normalize declared MIME
        cleaned_declared_mime = declared_mime.split(";")[0].strip().lower() if declared_mime else ""
        if cleaned_declared_mime in ("application/octet-stream", "binary/octet-stream", ""):
            cleaned_declared_mime = None

        # Guess mime from extension as fallback
        guessed_mime, _ = mimetypes.guess_type(filename)
        if guessed_mime:
            guessed_mime = guessed_mime.lower()

        # Determine resolved MIME
        resolved_mime = magic_mime or cleaned_declared_mime or guessed_mime or "application/octet-stream"

        # Categorization logic
        category = None

        # 1. Direct PDF check (magic bytes or mime or extension)
        if magic_mime == "application/pdf" or ext == ".pdf" or "pdf" in resolved_mime:
            category = FileCategory.PDF
            resolved_mime = "application/pdf"

        # 2. Image check
        elif resolved_mime.startswith("image/") or ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]:
            category = FileCategory.IMAGE
            if not resolved_mime.startswith("image/"):
                resolved_mime = guessed_mime or "image/jpeg"

        # 3. Spreadsheets check
        elif (
            ext in [".xls", ".xlsx", ".csv", ".tsv"]
            or "spreadsheet" in resolved_mime
            or "excel" in resolved_mime
            or resolved_mime == "text/csv"
        ):
            category = FileCategory.SPREADSHEET
            if ext == ".csv":
                resolved_mime = "text/csv"
            elif ext == ".xlsx":
                resolved_mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            elif ext == ".xls":
                resolved_mime = "application/vnd.ms-excel"

        # 4. Presentations check
        elif (
            ext in [".ppt", ".pptx"]
            or "presentation" in resolved_mime
            or "powerpoint" in resolved_mime
        ):
            category = FileCategory.PRESENTATION
            if ext == ".pptx":
                resolved_mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            elif ext == ".ppt":
                resolved_mime = "application/vnd.ms-powerpoint"

        # 5. Documents check (.doc, .docx, .txt, .rtf, .md or word mime or text/plain)
        elif (
            ext in [".doc", ".docx", ".txt", ".rtf", ".md"]
            or "wordprocessingml" in resolved_mime
            or "msword" in resolved_mime
            or resolved_mime == "text/plain"
        ):
            category = FileCategory.DOCUMENT
            if ext == ".docx":
                resolved_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext == ".doc":
                resolved_mime = "application/msword"
            elif ext == ".txt":
                resolved_mime = "text/plain"

        # 6. Fallback from extension dictionary if still undetermined
        if not category and ext in EXTENSION_CATEGORIES:
            category = EXTENSION_CATEGORIES[ext]

        # 7. Other / Unknown
        if not category:
            category = FileCategory.OTHER

        subdir = CATEGORY_SUBDIRS[category]
        logger.info(
            f"Classified attachment '{filename}' -> Category: {category.value}, MIME: {resolved_mime}, Subdir: {subdir}"
        )
        return category, resolved_mime, subdir
