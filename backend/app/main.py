import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.database import engine, Base
from backend.app.database import models  # Ensures models are imported before create_all
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.files import router as files_router
from backend.app.api.emails import router as emails_router
from backend.app.api.process import router as process_router
from backend.app.api.settings import router as settings_router
from backend.app.services.scheduler_service import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB tables exist in Supabase
    if engine is not None:
        try:
            logger.info("Initializing Supabase database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("Supabase database schema initialized successfully.")
        except Exception as e:
            logger.warning(f"Supabase connection notice: {e}. Tables will initialize upon valid connection.")
    else:
        logger.warning("DATABASE_URL is not configured yet. Please configure Supabase in backend/.env.")

    if settings.AUTO_POLL_ENABLED and engine is not None and not os.environ.get("VERCEL"):
        logger.info(f"Auto-poll enabled. Starting background poller (interval: {settings.POLL_INTERVAL_SECONDS}s)")
        scheduler.start()

    yield

    # Shutdown
    if scheduler.is_running:
        logger.info("Stopping background poller...")
        scheduler.stop()
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Automated Email Attachment Processing & File Management System",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(files_router, prefix=settings.API_V1_STR)
app.include_router(emails_router, prefix=settings.API_V1_STR)
app.include_router(process_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "OK"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "storage_ready": settings.STORAGE_PATH.exists()
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error handling {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. Please consult application logs."}
    )
