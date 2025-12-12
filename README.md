K-PDF Minimal Scaffold

This workspace contains a minimal Node.js Express API and static admin + request pages.

Quick start (Windows PowerShell):

```powershell
# install dependencies
npm install

# run
npm start
# or for auto-reload during development
npm run dev
```

Pages:
- Admin panel: http://localhost:3000/admin.html (requires admin password)
- Request form: http://localhost:3000/request.html

API endpoints:
- GET /api/enums -> returns category enumerations
- GET /api/pdfs -> list PDFs (supports query params l1,l2,l3,l4,q)
- GET /api/pdfs/:id -> single record
- POST /api/pdfs -> create PDF record (Basic auth required)
- POST /api/requests -> submit user request
- GET /api/requests -> list requests (Basic auth required)

Admin credentials (simple Basic auth):
- Username: admin
- Password: !kbs121314

Storage:
- `data/pdfs.json` stores uploaded PDF metadata
- `data/requests.json` stores user requests

Validation:
- `pdf_url` must end with `.pdf` or `.hwp` (case-insensitive)
- L1/L2/L3/L4 use fixed enumerations from the README

Notes:
- This is a minimal scaffold per your instructions: URLs only, no file uploads.
- If you want server-side header/content-type verification for URLs, I can add a HEAD fetch step.
