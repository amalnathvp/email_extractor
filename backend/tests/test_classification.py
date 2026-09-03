import pytest
from backend.app.services.classification_service import ClassificationService
from backend.app.database.models import FileCategory

def test_classify_pdf_magic_bytes():
    pdf_bytes = b"%PDF-1.4 sample content"
    cat, mime, subdir = ClassificationService.classify("unknown_file", pdf_bytes, "application/octet-stream")
    assert cat == FileCategory.PDF
    assert mime == "application/pdf"
    assert subdir == "pdf"

def test_classify_pdf_extension():
    cat, mime, subdir = ClassificationService.classify("invoice.pdf", b"dummy content", None)
    assert cat == FileCategory.PDF
    assert mime == "application/pdf"
    assert subdir == "pdf"

def test_classify_png_image():
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00"
    cat, mime, subdir = ClassificationService.classify("image.bin", png_bytes, "application/octet-stream")
    assert cat == FileCategory.IMAGE
    assert mime == "image/png"
    assert subdir == "jpg"

def test_classify_jpeg_image():
    jpeg_bytes = b"\xff\xd8\xff\xe0"
    cat, mime, subdir = ClassificationService.classify("photo.jpg", jpeg_bytes, "image/jpeg")
    assert cat == FileCategory.IMAGE
    assert mime == "image/jpeg"
    assert subdir == "jpg"

def test_classify_video_mp4():
    video_bytes = b"\x00\x00\x00\x18ftypmp42"
    cat, mime, subdir = ClassificationService.classify("movie.mp4", video_bytes, "video/mp4")
    assert cat == FileCategory.VIDEO
    assert mime == "video/mp4"
    assert subdir == "video"

def test_classify_audio_mp3():
    audio_bytes = b"ID3\x03\x00\x00\x00\x00\x00#TIT2"
    cat, mime, subdir = ClassificationService.classify("song.mp3", audio_bytes, "audio/mpeg")
    assert cat == FileCategory.AUDIO
    assert mime == "audio/mpeg"
    assert subdir == "audio"

def test_classify_spreadsheet_csv():
    csv_bytes = b"Col1,Col2\nVal1,Val2"
    cat, mime, subdir = ClassificationService.classify("data.csv", csv_bytes, "text/csv")
    assert cat == FileCategory.SPREADSHEET
    assert mime == "text/csv"
    assert subdir == "spreadsheets"

def test_classify_spreadsheet_xlsx():
    cat, mime, subdir = ClassificationService.classify(
        "budget.xlsx",
        b"PK\x03\x04zipcontent",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert cat == FileCategory.SPREADSHEET
    assert "spreadsheetml" in mime
    assert subdir == "spreadsheets"

def test_classify_document_docx():
    cat, mime, subdir = ClassificationService.classify("memo.docx", b"PK\x03\x04zipcontent", None)
    assert cat == FileCategory.DOCUMENT
    assert subdir == "documents"

def test_classify_presentation_pptx():
    cat, mime, subdir = ClassificationService.classify("slides.pptx", b"PK\x03\x04zipcontent", None)
    assert cat == FileCategory.PRESENTATION
    assert subdir == "presentations"

def test_classify_other_unknown():
    cat, mime, subdir = ClassificationService.classify("script.py", b"print('hello')", "text/x-python")
    assert cat == FileCategory.OTHER
    assert subdir == "others"
