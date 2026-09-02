import pytest
import sys
import shutil
from pathlib import Path
from tempfile import mkdtemp

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.app.database.database import Base, get_db
from backend.app.main import app
from backend.app.core.config import settings

@pytest.fixture(scope="session")
def test_storage_dir():
    temp_dir = Path(mkdtemp(prefix="fileflow_test_storage_"))
    original_storage = settings.STORAGE_PATH
    settings.STORAGE_PATH = temp_dir

    for category in ["pdf", "images", "documents", "spreadsheets", "presentations", "others"]:
        (temp_dir / category).mkdir(parents=True, exist_ok=True)

    yield temp_dir

    # Cleanup
    settings.STORAGE_PATH = original_storage
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="function")
def db_session(test_storage_dir):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
