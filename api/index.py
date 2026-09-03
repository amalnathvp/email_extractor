import os
import sys
from pathlib import Path
import traceback

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

for path_entry in [ROOT_DIR, CURRENT_DIR, ROOT_DIR / "backend"]:
    path_str = str(path_entry)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

init_error = None
app = None

try:
    from backend.app.main import app as backend_app
    app = backend_app
except Exception as e:
    init_error = f"{type(e).__name__}: {str(e)}\n\n{traceback.format_exc()}"
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="Diagnostic Fallback")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def fallback_handler(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Initialization Error",
                "details": init_error,
                "sys_path": sys.path,
                "root_exists": ROOT_DIR.exists(),
                "root_files": os.listdir(str(ROOT_DIR)) if ROOT_DIR.exists() else []
            }
        )

application = app
handler = app
