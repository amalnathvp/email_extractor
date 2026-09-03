import os
import sys
from pathlib import Path

# Add project root and backend paths to sys.path so 'backend.app' can be resolved by Vercel
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

for path_entry in [ROOT_DIR, CURRENT_DIR, ROOT_DIR / "backend"]:
    path_str = str(path_entry)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

from backend.app.main import app

# Expose standard top-level entrypoints recognized by Vercel's Python runtime
application = app
handler = app
