# Mail Extractor — Email Attachment Processing & Auto-Sorting System

> A minimalist, production-ready system that listens for incoming emails to `amalnathvp@zohomail.in`, extracts attachments, categorizes them by type into clean storage directories (`pdf/`, `jpg/`, `video/`, `audio/`, `others/`), logs records to **Supabase (PostgreSQL)**, and displays everything in a Gmail-themed web interface.

---

## Architecture Overview

### High-Level System Architecture

```mermaid
flowchart TD
    subgraph External["External Services"]
        Sender["External Senders"] -->|Send Email| Zoho["Zoho Mail Inbox<br/>(amalnathvp@zohomail.in)"]
        Zoho -->|IMAP SSL:993| Backend
    end

    subgraph Backend["FastAPI Backend (Port 8000)"]
        Receiver["IMAP Receiver & Poller"]
        Parser["MIME & Attachment Parser"]
        Classifier["Magic Byte & Extension Classifier"]
        StorageEngine["Secure File Storage Engine"]
        API["FastAPI REST Endpoints"]
        
        Receiver --> Parser
        Parser --> Classifier
        Classifier --> StorageEngine
        API <--> Receiver
    end

    subgraph Database["Database Layer"]
        Supabase[("Supabase PostgreSQL<br/>(Connection Pooler)")]
        Parser -->|Check Message-ID Idempotency| Supabase
        StorageEngine -->|Save Email & Attachment Metadata| Supabase
    end

    subgraph FileStorage["Categorized File Storage"]
        StorageEngine --> PDF["backend/storage/pdf/"]
        StorageEngine --> JPG["backend/storage/jpg/"]
        StorageEngine --> Video["backend/storage/video/"]
        StorageEngine --> Audio["backend/storage/audio/"]
        StorageEngine --> Others["backend/storage/others/"]
    end

    subgraph Frontend["React Frontend (Port 5173)"]
        UI["Gmail-Inspired Web UI"]
        UI <-->|Vite Proxy /api| API
    end
```

---

### Attachment Processing & Auto-Sorting Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor External as Sender
    participant Zoho as Zoho Mail (IMAP)
    participant Worker as Mail Extractor Service
    participant Supabase as Supabase (PostgreSQL)
    participant Disk as Local Storage
    participant UI as Web Dashboard

    External->>Zoho: Send email with attachments
    Worker->>Zoho: Poll unread emails (`UNSEEN`)
    Zoho-->>Worker: Return RFC 822 raw message bytes
    
    Worker->>Worker: Parse headers, body, Message-ID
    Worker->>Supabase: Query `emails` for existing `message_id`
    
    alt Email already processed (Duplicate)
        Worker-->>Zoho: Skip & Mark seen
    else New Email
        Worker->>Disk: Store file by category:
        Note over Worker,Disk: PDF -> storage/pdf/<br/>JPG/PNG -> storage/jpg/<br/>MP4/MOV -> storage/video/<br/>MP3/WAV -> storage/audio/<br/>Others -> storage/others/
        Worker->>Supabase: Insert `emails` record
        Worker->>Supabase: Insert `attachments` records with category & file path
        Worker-->>Zoho: Mark message as read
    end

    UI->>Worker: GET /api/emails & GET /api/files
    Worker->>Supabase: Fetch records
    Supabase-->>UI: Return sorted emails & attachments
```

---

## Core Features

- **Dedicated Inbox Receiver**: Listens to `amalnathvp@zohomail.in` via secure Zoho IMAP (`imap.zoho.in:993`, SSL enabled).
- **Automated Multi-Layer Sorting**:
  - **`PDF`** (`storage/pdf/`) — Documents validated with `%PDF-` magic bytes and `.pdf` extension.
  - **`JPG / Images`** (`storage/jpg/`) — Photos & graphics (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`).
  - **`Video`** (`storage/video/`) — Media clips (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`).
  - **`Audio`** (`storage/audio/`) — Voice notes & audio (`.mp3`, `.wav`, `.aac`, `.ogg`, `.m4a`).
  - **`Others`** (`storage/others/`) — Remaining non-media attachments.
- **Supabase PostgreSQL Persistence**: All email metadata, status, timestamps, and attachment details are stored in Supabase with automatic connection pooling (`pool_pre_ping=True`, `pool_recycle=300`).
- **Strict Idempotency**: Guarantees zero duplicate downloads by validating RFC 822 `Message-ID` in Supabase before processing.
- **Collision-Resistant Storage**: Stored as `filename_YYYYMMDD_HHMMSS_uuid8.ext` while preserving original user filenames in metadata.
- **Gmail-Inspired Frontend**:
  - Folder views for `All Received Mails`, `PDF`, `JPG / Images`, `Video`, `Audio`, and `Other`.
  - Reading pane with full body view and attachment pill cards.
  - Instant live search across email subjects, sender names, and filenames.
  - In-browser file preview (PDF reader, image zoom, audio player, video player) and one-click downloads.
  - One-click **"Receive Incoming Mail"** intake simulation button.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12+, FastAPI, Uvicorn |
| **Database** | Supabase (PostgreSQL), SQLAlchemy 2.0, Psycopg2 |
| **Mail Client** | Python `imaplib`, `email.message`, MIME Parser |
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, Lucide Icons |
| **Testing** | Pytest, FastAPI TestClient, Pytest-Asyncio |

---

## Project Structure

```text
Email/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard.py       # Metrics, stats, and logs
│   │   │   ├── emails.py          # Email listing and detail routes
│   │   │   ├── files.py           # Categorized file download & preview routes
│   │   │   ├── process.py         # Sync trigger and email simulation
│   │   │   └── settings.py        # Mailbox & database configurations
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic configuration & environment
│   │   │   └── logging.py         # Structured application logger
│   │   ├── database/
│   │   │   ├── database.py        # Supabase PostgreSQL engine & sessionmaker
│   │   │   └── models.py          # SQLAlchemy models (emails, attachments)
│   │   ├── schemas/               # Pydantic request & response schemas
│   │   ├── services/
│   │   │   ├── classification.py  # Binary magic-bytes & MIME classification
│   │   │   ├── email_service.py   # Zoho IMAP connection & email parser
│   │   │   ├── processing_service.py # Orchestrator & idempotent pipeline
│   │   │   ├── scheduler_service.py  # Automated background inbox poller
│   │   │   └── storage_service.py    # Collision-proof file persistence
│   │   └── main.py                # FastAPI application entrypoint
│   ├── storage/                   # Organized attachment destination folders
│   │   ├── pdf/
│   │   ├── jpg/
│   │   ├── video/
│   │   ├── audio/
│   │   └── others/
│   ├── tests/                     # 25 automated unit tests
│   ├── .env                       # Environment variables (Zoho & Supabase)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Typed REST API client
│   │   ├── components/
│   │   │   └── files/
│   │   │       └── FilePreviewModal.tsx # PDF, Image, Video, Audio preview modal
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Main Gmail-themed application UI
│   │   └── main.tsx               # React DOM root
│   ├── vite.config.ts             # Vite server with /api proxy to port 8000
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project

---

### 2. Environment Configuration

Create or verify `backend/.env`:

```env
# Mail Configuration (Zoho Mail)
EMAIL_HOST=imap.zoho.in
EMAIL_PORT=993
EMAIL_USERNAME=amalnathvp@zohomail.in
EMAIL_PASSWORD=your_zoho_app_password
EMAIL_USE_SSL=true
EMAIL_FOLDER=INBOX
EMAIL_SEARCH_CRITERIA=UNSEEN
MARK_SEEN_ON_PROCESS=true

# Supabase PostgreSQL Database (IPv4 Pooler URI)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_URL=https://[PROJECT_REF].supabase.co

# Storage & Auto-Poll
STORAGE_PATH=storage
AUTO_POLL_ENABLED=true
POLL_INTERVAL_SECONDS=30
```

---

### 3. Backend Setup & Run

1. Open a terminal in the project root:
   ```powershell
   # Install dependencies
   pip install -r backend/requirements.txt
   
   # Start FastAPI server on port 8000
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```
2. The API will be available at:
   - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 4. Frontend Setup & Run

1. Open a second terminal and navigate to the `frontend` folder:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
2. Open your browser at:
   - **Web App**: [http://localhost:5173](http://localhost:5173)

---

## Running the Automated Test Suite

The test suite covers classification, binary magic-byte detection, idempotency, MIME header decoding, path-traversal security, and REST API endpoints:

```powershell
python -m pytest backend/tests -v
```

Output:
```text
======================== 25 passed in 4.94s ========================
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health and storage status |
| `GET` | `/api/emails` | Paginated list of incoming emails (with attachment counts) |
| `GET` | `/api/emails/{id}` | Full email body (plain text & HTML) and attachment list |
| `GET` | `/api/files` | Categorized files filterable by `category` (PDF, IMAGE, VIDEO, AUDIO, OTHER) |
| `GET` | `/api/files/{id}/download` | Stream and download an attachment file |
| `GET` | `/api/files/{id}/preview` | In-browser preview streaming |
| `DELETE` | `/api/files/{id}` | Delete an attachment from database and disk |
| `POST` | `/api/process/sync` | Trigger an immediate inbox poll for unread emails |
| `POST` | `/api/process/simulate` | Ingest a simulated incoming email with test attachments |
| `GET` | `/api/stats` | Mailbox summary metrics and category counts |

---

## License

MIT License. Designed for automated email intake and file management.
