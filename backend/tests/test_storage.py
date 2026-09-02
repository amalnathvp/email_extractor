import pytest
from pathlib import Path
from backend.app.services.storage_service import (
    StorageService,
    StorageSecurityError,
    FileSizeLimitExceededError
)
from backend.app.core.config import settings

def test_sanitize_filename_traversal():
    unsafe_names = [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\cmd.exe",
        "nested/folder/document.pdf",
        "file\x00with_null.txt",
        "...///dangerous.exe"
    ]
    for name in unsafe_names:
        clean = StorageService.sanitize_filename(name)
        assert "/" not in clean
        assert "\\" not in clean
        assert "\x00" not in clean
        assert not clean.startswith("..")

def test_generate_stored_filename():
    stored = StorageService.generate_stored_filename("invoice.pdf")
    assert stored.startswith("invoice_")
    assert stored.endswith(".pdf")
    # Generating twice should yield distinct names
    stored2 = StorageService.generate_stored_filename("invoice.pdf")
    assert stored != stored2

def test_store_file_and_retrieve(test_storage_dir):
    content = b"PDF dummy content"
    stored_name, rel_path, size = StorageService.store_file("test.pdf", content, "pdf")

    assert size == len(content)
    assert rel_path == f"pdf/{stored_name}"

    abs_path = StorageService.get_absolute_path(rel_path)
    assert abs_path.exists()
    assert abs_path.read_bytes() == content

def test_path_traversal_detection(test_storage_dir):
    with pytest.raises(StorageSecurityError):
        StorageService.get_absolute_path("../outside_root.txt")

def test_file_size_limit():
    original_limit = settings.MAX_FILE_SIZE_BYTES
    settings.MAX_FILE_SIZE_BYTES = 50  # 50 bytes limit for test

    try:
        with pytest.raises(FileSizeLimitExceededError):
            StorageService.store_file("large.bin", b"A" * 100, "others")
    finally:
        settings.MAX_FILE_SIZE_BYTES = original_limit
