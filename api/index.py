import os
import sys
from pathlib import Path

# Add all relevant paths to sys.path so 'backend.app' can be found in any serverless structure
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

for p in [ROOT_DIR, CURRENT_DIR, ROOT_DIR / "backend"]:
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

try:
    from backend.app.main import app
except Exception as e:
    import traceback
    tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="Error Fallback")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def error_fallback(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "FastAPI App Initialization Error",
                "details": str(e),
                "traceback": tb
            }
        )
