from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_STORAGE_DIR = BACKEND_DIR / "storage"
DEFAULT_LOGS_DIR = BACKEND_DIR / "logs"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "FileFlow - Email Attachment Processing System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False

    # Email / IMAP Configuration (Zoho Mail)
    TARGET_EMAIL: str = "amalnathvp@zohomail.in"

    EMAIL_HOST: str = "imap.zoho.in"
    EMAIL_PORT: int = 993
    EMAIL_USERNAME: str = "amalnathvp@zohomail.in"
    EMAIL_PASSWORD: str = ""
    EMAIL_USE_SSL: bool = True
    EMAIL_FOLDER: str = "INBOX"
    EMAIL_SEARCH_CRITERIA: str = "UNSEEN"  # or 'ALL'
    MARK_SEEN_ON_PROCESS: bool = True

    # Database Configuration (Supabase PostgreSQL Pooler)
    DATABASE_URL: str = "postgresql://postgres.kaasbhpibxzvqhdrdbst:mailmanageramal31@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
    SUPABASE_URL: str = "https://kaasbhpibxzvqhdrdbst.supabase.co"
    SUPABASE_KEY: str = ""

    # File Storage Configuration
    STORAGE_PATH: Path = DEFAULT_STORAGE_DIR
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB safety limit

    # Background Polling Configuration
    AUTO_POLL_ENABLED: bool = False
    POLL_INTERVAL_SECONDS: int = 120

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    @field_validator("STORAGE_PATH", mode="before")
    def assemble_storage_path(cls, v: Union[str, Path]) -> Path:
        if isinstance(v, str):
            p = Path(v)
            if not p.is_absolute():
                p = (BACKEND_DIR / p).resolve()
            return p
        return v

settings = Settings()

# Ensure directories exist
settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
DEFAULT_LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Pre-create category directories
for category in ["pdf", "images", "documents", "spreadsheets", "presentations", "others"]:
    (settings.STORAGE_PATH / category).mkdir(parents=True, exist_ok=True)
