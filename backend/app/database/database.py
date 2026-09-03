import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from backend.app.core.config import settings

def get_database_url() -> str:
    url = settings.DATABASE_URL or os.environ.get("DATABASE_URL", "")
    # SQLAlchemy requires postgresql:// instead of postgres://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Supabase Transaction Pooler (port 6543) supports unlimited connections and avoids EMAXCONNSESSION
    if "pooler.supabase.com:5432" in url:
        url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
    return url

db_url = get_database_url()

engine_kwargs = {
    "echo": settings.DEBUG,
}

from sqlalchemy.pool import NullPool

if db_url.startswith("postgresql"):
    engine_kwargs.update({
        "poolclass": NullPool,
        "connect_args": {"sslmode": "require"}
    })

# If DATABASE_URL is not yet provided, engine is None until configured
engine = create_engine(db_url, **engine_kwargs) if db_url else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for Supabase database session management."""
    if SessionLocal is None:
        raise RuntimeError(
            "Supabase database connection not configured. "
            "Please set DATABASE_URL in backend/.env with your Supabase PostgreSQL connection URI."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
