import pytest
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from backend.app.services.parser_service import EmailParserService

def test_decode_mime_header_utf8_base64():
    # =?UTF-8?B?UHLDvGZ1bmc=?= is "Prüfung"
    raw_header = "=?UTF-8?B?UHLDvGZ1bmc=?="
    decoded = EmailParserService.decode_mime_header(raw_header)
    assert decoded == "Prüfung"

def test_decode_mime_header_plain():
    assert EmailParserService.decode_mime_header("Simple Subject") == "Simple Subject"
    assert EmailParserService.decode_mime_header(None) == ""

def test_generate_fallback_message_id():
    id1 = EmailParserService.generate_fallback_message_id("test@example.com", "Hello", "2026-09-02")
    id2 = EmailParserService.generate_fallback_message_id("test@example.com", "Hello", "2026-09-02")
    id3 = EmailParserService.generate_fallback_message_id("other@example.com", "Hello", "2026-09-02")

    assert id1 == id2
    assert id1 != id3
    assert id1.startswith("<generated-")

def test_parse_raw_message_with_attachments():
    msg = MIMEMultipart("mixed")
    msg["From"] = "sender@company.com"
    msg["To"] = "receiver@company.com"
    msg["Subject"] = "Important Documents"
    msg["Message-ID"] = "<test-msg-123@company.com>"
    msg["Date"] = "Wed, 02 Sep 2026 10:00:00 +0000"

    # Text body
    msg.attach(MIMEText("Here are the requested attachments.", "plain"))

    # Attachment 1
    pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj"
    part1 = MIMEApplication(pdf_content, _subtype="pdf")
    part1.add_header("Content-Disposition", "attachment", filename="contract.pdf")
    msg.attach(part1)

    # Attachment 2
    txt_content = b"Item,Qty\nApples,5\n"
    part2 = MIMEApplication(txt_content, _subtype="csv")
    part2.add_header("Content-Disposition", "attachment", filename="inventory.csv")
    msg.attach(part2)

    raw_bytes = msg.as_bytes()
    parsed = EmailParserService.parse_raw_message(raw_bytes)

    assert parsed.message_id == "<test-msg-123@company.com>"
    assert parsed.sender == "sender@company.com"
    assert parsed.subject == "Important Documents"
    assert "Here are the requested attachments." in parsed.body_text
    assert len(parsed.attachments) == 2

    assert parsed.attachments[0].filename == "contract.pdf"
    assert parsed.attachments[0].content == pdf_content
    assert parsed.attachments[1].filename == "inventory.csv"
    assert parsed.attachments[1].content == txt_content
