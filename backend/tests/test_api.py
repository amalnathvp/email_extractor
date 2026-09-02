import pytest

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_dashboard_stats_empty(client):
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_emails"] == 0
    assert data["total_attachments"] == 0
    assert data["categories"]["PDF"] == 0

def test_simulate_process_and_endpoints(client):
    # 1. Trigger simulation
    sim_res = client.post("/api/process/simulate")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["success"] is True
    assert sim_data["emails_processed"] == 1
    assert sim_data["attachments_stored"] == 4

    # 2. Check stats updated
    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_emails"] == 1
    assert stats["total_attachments"] == 4
    assert stats["categories"]["PDF"] == 1
    assert stats["categories"]["IMAGE"] == 1
    assert stats["categories"]["DOCUMENT"] == 1
    assert stats["categories"]["SPREADSHEET"] == 1

    # 3. List files
    files_res = client.get("/api/files")
    assert files_res.status_code == 200
    files_data = files_res.json()
    assert files_data["total"] == 4
    assert len(files_data["items"]) == 4

    # Test category filter
    pdf_filter = client.get("/api/files?category=PDF")
    assert pdf_filter.status_code == 200
    assert pdf_filter.json()["total"] == 1
    pdf_item = pdf_filter.json()["items"][0]
    assert pdf_item["file_category"] == "PDF"

    file_id = pdf_item["id"]

    # 4. Preview file
    prev_res = client.get(f"/api/files/{file_id}/preview")
    assert prev_res.status_code == 200
    assert "pdf" in prev_res.headers.get("content-type", "").lower()
    assert prev_res.content.startswith(b"%PDF-")

    # 5. Download file
    down_res = client.get(f"/api/files/{file_id}/download")
    assert down_res.status_code == 200
    assert "attachment" in down_res.headers.get("content-disposition", "").lower()

    # 6. List emails
    emails_res = client.get("/api/emails")
    assert emails_res.status_code == 200
    emails_data = emails_res.json()
    assert emails_data["total"] == 1
    email_id = emails_data["items"][0]["id"]
    assert emails_data["items"][0]["attachment_count"] == 4

    # 7. Get email detail
    email_detail = client.get(f"/api/emails/{email_id}")
    assert email_detail.status_code == 200
    e_data = email_detail.json()
    assert len(e_data["attachments"]) == 4
    assert e_data["status"] == "PROCESSED"
