# Email Extractor

> An automated, production-ready email ingestion and attachment auto-sorting system. Listens to an incoming email inbox, parses incoming emails, automatically categorizes attachments into dedicated folders (`pdf/`, `jpg/`, `video/`, `audio/`, `others/`), stores records in **Supabase (PostgreSQL)**, and displays everything in a Gmail-inspired web dashboard.

---

## What is Email Extractor?

**Email Extractor** is a system designed to eliminate manual email attachment management. Instead of manually downloading, organizing, and filing attachments from incoming emails, Email Extractor automates the entire pipeline:

1. **Automated Inbox Listening**: Connects directly to your mail server via secure IMAP (`SSL:993`) and monitors for incoming emails.
2. **Intelligent Attachment Sorting**: Inspects incoming file MIME types, extensions, and headers to automatically organize attachments into dedicated folders:
   - 📄 **PDF Folder** (`storage/pdf/`): `.pdf` documents.
   - 🖼️ **JPG / Images Folder** (`storage/jpg/`): `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
   - 🎥 **Video Folder** (`storage/video/`): `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`.
   - 🎵 **Audio Folder** (`storage/audio/`): `.mp3`, `.wav`, `.aac`, `.ogg`, `.m4a`.
   - 📦 **Other Files Folder** (`storage/others/`): `.zip`, spreadsheets, docs, and other files.
3. **Database Persistence**: Saves email metadata, full message body, sender information, received timestamps, and attachment details to **Supabase (PostgreSQL)** with strict RFC 822 `Message-ID` idempotency (ensuring zero duplicate downloads).
4. **Gmail-Inspired Web Dashboard**: A fast, responsive React dashboard that allows you to view emails, browse files by category folders, preview files inline, search across messages and attachments, and delete items with instant 0ms response.

---

## Dashboard Preview

![Email Extractor Dashboard](assets/dashboard_preview.png)

*The Gmail-style web interface features categorized folder navigation (PDF, JPG, Video, Audio, Others), inline attachment pills with one-click download/preview, real-time search, and instant deletion.*

---

## Simple and Explainable Architecture

Below is the high-level architecture of Email Extractor:

```mermaid
flowchart LR
    A[External Sender<br/>Sends Email with Files] --> B[Email Inbox<br/>Zoho / Gmail / Outlook]
    B -->|IMAP SSL:993| C[Email Extractor Backend<br/>FastAPI Service]
    C -->|Auto-Categorize| D[Categorized Storage<br/>pdf / jpg / video / audio / others]
    C -->|Store Records & Blobs| E[(Supabase PostgreSQL)]
    E --> F[React Dashboard<br/>Gmail-Inspired UI]
    C -->|REST API| F
```

### How the Flow Works:
1. **Email Arrival**: Senders send emails with attachments to your configured email address.
2. **Ingestion & Parsing**: The backend polls the mail server via IMAP, retrieves raw email bytes, and parses headers, sender, subject, and MIME parts.
3. **Auto-Sorting & Storage**: Attachments are automatically sorted by category into dedicated directories on disk and persisted in Supabase.
4. **Instant Web Access**: The frontend communicates with the backend REST API to display organized folders, preview files, and provide instant management.

---

## Configuring the Email Address

> [!NOTE]
> **Default Email Address**: The system is pre-configured with the default inbox **`amalnathvp@zohomail.in`**.
> You can easily change this to your own email address (Zoho Mail, Gmail, Outlook, Yahoo, or any custom IMAP mail server).

### How to Change the Email Address

#### Step 1: Update the Backend Configuration
Open `backend/.env` (or create it from your environment template) and update the credentials:

```env
# Target email inbox
TARGET_EMAIL="your-email@example.com"

# IMAP Server Configuration
EMAIL_HOST="imap.zoho.in"          # e.g., imap.zoho.in, imap.gmail.com, outlook.office365.com
EMAIL_PORT=993                    # Standard IMAP SSL port
EMAIL_USERNAME="your-email@example.com"
EMAIL_PASSWORD="your-app-password" # App Password / App-specific token
EMAIL_USE_SSL=true
EMAIL_FOLDER="INBOX"
```

#### Step 2: (Optional) Update the Frontend Display
The frontend displays the active inbox in the top header. You can set the `VITE_EMAIL_ADDRESS` environment variable in `frontend/.env`:

```env
VITE_EMAIL_ADDRESS="your-email@example.com"
```

*(If omitted, it defaults to `amalnathvp@zohomail.in` or whatever fallback is set in `frontend/src/App.tsx`).*

---

### Mail Provider Setup Guides

<details>
<summary><b>1. Zoho Mail (Default)</b></summary>

- **Host**: `imap.zoho.in` (for `.in` accounts) or `imap.zoho.com` (for global/US accounts)
- **Port**: `993`
- **SSL**: `true`
- **Password**: Zoho requires an **Application-Specific Password**:
  1. Go to [Zoho Accounts Security](https://accounts.zoho.com/home#security/app_password).
  2. Select **Application-Specific Passwords** -> **Generate New Password**.
  3. Enter the generated password in `EMAIL_PASSWORD`.
</details>

<details>
<summary><b>2. Gmail (Google Workspace / Personal Gmail)</b></summary>

- **Host**: `imap.gmail.com`
- **Port**: `993`
- **SSL**: `true`
- **Password**: Google requires an **App Password** (standard passwords will be rejected):
  1. Turn on **2-Step Verification** on your Google Account.
  2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
  3. Generate an App Password for "Mail" and paste the 16-character code into `EMAIL_PASSWORD`.
  4. Ensure IMAP is enabled in Gmail Settings -> Forwarding and POP/IMAP -> Enable IMAP.
</details>

<details>
<summary><b>3. Microsoft Outlook / Office 365</b></summary>

- **Host**: `outlook.office365.com`
- **Port**: `993`
- **SSL**: `true`
- **Password**: Use your account password or an App Password if MFA is enabled.
</details>

<details>
<summary><b>4. Custom / Self-Hosted IMAP</b></summary>

- **Host**: Your mail server hostname (e.g., `mail.yourdomain.com`)
- **Port**: `993` (SSL) or `143` (STARTTLS)
- **Password**: Your standard mailbox credentials.
</details>

---

## How Can We Use It?

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)
- **Supabase Account**: Free Supabase PostgreSQL database URL

---

### Step 1: Backend Setup & Run

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `backend/.env`:
   ```env
   TARGET_EMAIL="amalnathvp@zohomail.in"
   EMAIL_HOST="imap.zoho.in"
   EMAIL_PORT=993
   EMAIL_USERNAME="amalnathvp@zohomail.in"
   EMAIL_PASSWORD="your-password"
   EMAIL_USE_SSL=true

   # Supabase Database URL
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   The backend API will be live at `http://localhost:8000` with interactive OpenAPI docs at `http://localhost:8000/docs`.

---

### Step 2: Frontend Setup & Run

1. In a new terminal, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser at:
   ```
   http://localhost:5173
   ```

---

### Step 3: Using the Application

- **Receive & Sync Emails**:
  - Send an email with attachments (PDF, pictures, audio, video, etc.) to your configured email address.
  - Click the **Sync (Refresh)** icon in the dashboard toolbar to immediately fetch and process new incoming emails.
- **Categorized Folder Views**:
  - Click **All Received Mails** on the left sidebar to view all messages and their attachment chips.
  - Click **PDF Folder**, **JPG / Images**, **Video Folder**, **Audio Folder**, or **Other Files** to see gallery cards of all files sorted automatically into those categories.
- **Preview & Download**:
  - Click any attachment chip in the email list or gallery card to open an inline preview modal (supports PDF, images, audio playback, video playback, and text).
  - Click the **Download** button to save the file locally.
- **Instant Search**:
  - Use the search bar at the top to filter emails and attachments in real time by sender, subject, or filename.
- **Instant Deletion (0ms Delay)**:
  - Hover over an email row and click the trash icon, or select multiple emails with checkboxes and click **Delete** — items are removed instantly from the screen without any lag.

---

## Folder Structure

```
Email/
├── assets/                             # Documentation assets & screenshots
│   └── dashboard_preview.png           # Dashboard UI preview screenshot
├── backend/                            # FastAPI backend application
│   ├── app/
│   │   ├── api/                        # REST API routers
│   │   │   ├── dashboard.py            # Dashboard metrics & overview
│   │   │   ├── emails.py               # Email listing, detail, and instant deletion
│   │   │   ├── files.py                # File download, preview, and category listing
│   │   │   ├── process.py              # Manual & automatic IMAP sync triggers
│   │   │   └── settings.py             # System configuration endpoints
│   │   ├── core/                       # Core application configuration & logging
│   │   │   ├── config.py               # Pydantic environment settings
│   │   │   └── logging.py              # Centralized logging configuration
│   │   ├── database/                   # Database layer
│   │   │   ├── database.py             # SQLAlchemy session & Supabase connection pooler
│   │   │   └── models.py               # Email & Attachment ORM models
│   │   ├── schemas/                    # Pydantic request/response validation schemas
│   │   │   ├── attachment.py           # Attachment schemas
│   │   │   └── email.py                # Email schemas
│   │   ├── services/                   # Business logic engines
│   │   │   ├── classifier_service.py   # Magic-byte and extension file classifier
│   │   │   ├── email_receiver.py       # IMAP SSL client & message fetcher
│   │   │   ├── parser_service.py       # MIME multipart & header parser
│   │   │   ├── processing_service.py   # Attachment intake orchestrator
│   │   │   └── storage_service.py      # Category-based disk storage engine
│   │   └── main.py                     # FastAPI application factory & CORS setup
│   ├── storage/                        # Category storage directories
│   │   ├── pdf/                        # Auto-sorted PDF documents
│   │   ├── jpg/                        # Auto-sorted JPG / PNG / WebP images
│   │   ├── video/                      # Auto-sorted video files (MP4, MOV, etc.)
│   │   ├── audio/                      # Auto-sorted voice notes & audio (MP3, WAV)
│   │   └── others/                     # Auto-sorted other files
│   ├── requirements.txt                # Python backend dependencies
│   └── .env                            # Backend environment configuration
├── frontend/                           # React + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts               # Typed REST API client
│   │   ├── components/
│   │   │   └── files/
│   │   │       ├── FileGalleryCard.tsx # File card with preview & download actions
│   │   │       └── FilePreviewModal.tsx# Universal modal preview for media & docs
│   │   ├── types/
│   │   │   └── index.ts                # Shared TypeScript types
│   │   ├── App.tsx                     # Main Gmail-style dashboard interface
│   │   ├── index.css                   # Tailwind styles & utility classes
│   │   └── main.tsx                    # React application entrypoint
│   ├── package.json                    # Node.js dependencies and scripts
│   └── vite.config.ts                  # Vite build configuration & API proxy
├── api/                                # Vercel serverless functions wrapper
│   ├── index.py                        # Serverless bridge to backend app
│   └── requirements.txt                # Serverless deployment dependencies
├── vercel.json                         # Vercel deployment configuration
└── README.md                           # Project documentation
```

---

## License

MIT License — Feel free to use and adapt this project for your own email processing and attachment management needs.
