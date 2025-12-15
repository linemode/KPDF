const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PDFS_FILE = path.join(DATA_DIR, 'pdfs.json');
const REQS_FILE = path.join(DATA_DIR, 'requests.json');

const ADMIN_USER = 'admin';
const ADMIN_PASS = '!kbs121314';

// Simple in-memory session store: token -> { created }
const SESSIONS = {}; 

const ENUMS = {
  l1: [
    "중등 교육과정",
    "고등 교육과정",
    "기타"
  ],
  l2: [
    "국어",
    "수학",
    "영어",
    "과학",
    "사회",
    "기타"
  ],
  l3_secondary: ["중1", "중2", "중3"],
  l3_high: ["고1", "고2", "고3"],
  l4: [
    "교과서",
    "교사용",
    "내신서",
    "시험지",
    "문제집",
    "해답지"
  ]
};

app.use(express.json());


async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PDFS_FILE);
  } catch (e) {
    await fs.writeFile(PDFS_FILE, '[]', 'utf8');
  }
  try {
    await fs.access(REQS_FILE);
  } catch (e) {
    await fs.writeFile(REQS_FILE, '[]', 'utf8');
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const obj = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx>0){
      const k = pair.slice(0,idx).trim();
      const v = pair.slice(idx+1).trim();
      obj[k]=decodeURIComponent(v);
    }
  });
  return obj;
}

function requireAdmin(req, res, next) {
  // Allow Basic auth (backwards compatible)
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Basic ')) {
    const token = auth.split(' ')[1];
    const creds = Buffer.from(token, 'base64').toString();
    if (creds === `${ADMIN_USER}:${ADMIN_PASS}`) return next();
  }
  // Or allow cookie session
  const cookies = parseCookies(req);
  if (cookies.kbspdf_auth && SESSIONS[cookies.kbspdf_auth]) return next();

  res.status(403).json({ error: 'Forbidden' });
}

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function validatePdfPayload(payload) {
  const errors = [];
  const { category_l1, category_l2, category_l3, category_l4, main_title, pdf_url } = payload;
  if (!category_l1 || !ENUMS.l1.includes(category_l1)) errors.push('Invalid category_l1');
  if (!category_l2 || !ENUMS.l2.includes(category_l2)) errors.push('Invalid category_l2');
  if (!category_l4 || !ENUMS.l4.includes(category_l4)) errors.push('Invalid category_l4');
  if (!main_title || typeof main_title !== 'string' || !main_title.trim()) errors.push('main_title required');
  if (!pdf_url || typeof pdf_url !== 'string') errors.push('pdf_url required');
  else {
    const lower = pdf_url.toLowerCase();
    if (!(lower.endsWith('.pdf') || lower.endsWith('.hwp'))) errors.push('pdf_url must end with .pdf or .hwp');
  }
  // Validate category_l3 depending on l1
  if (!category_l3 || typeof category_l3 !== 'string') {
    errors.push('category_l3 required');
  } else {
    // Determine allowed L3 values based on selected L1.
    // ENUMS.l1 contains Korean strings (e.g. '중등 교육과정', '고등 교육과정'),
    // so check for those values (or substrings) rather than English words.
    let allowed = [];
    if (category_l1 === ENUMS.l1[0] || (typeof category_l1 === 'string' && category_l1.includes('중등'))) {
      allowed = ENUMS.l3_secondary;
    } else if (category_l1 === ENUMS.l1[1] || (typeof category_l1 === 'string' && category_l1.includes('고등'))) {
      allowed = ENUMS.l3_high;
    } else {
      // If L1 is unspecified or an unknown value, allow any L3 from both sets.
      allowed = Array.from(new Set([...(ENUMS.l3_secondary || []), ...(ENUMS.l3_high || [])]));
    }
    if (!allowed.includes(category_l3)) errors.push('Invalid category_l3 for selected category_l1');
  }
  return errors;
}

app.get('/api/enums', (req, res) => {
  res.json(ENUMS);
});

// Admin-only debug endpoint: shows pdfs file path, mtime, size, and count
app.get('/admin/debug-data', requireAdmin, async (req, res) => {
  try {
    const stat = await fs.stat(PDFS_FILE);
    const data = await readJson(PDFS_FILE);
    return res.json({ path: PDFS_FILE, size: stat.size, mtime: stat.mtime, count: Array.isArray(data)?data.length:0 });
  } catch (e) {
    return res.status(500).json({ error: 'Cannot read data file', detail: String(e) });
  }
});

// Admin login: POST /admin/login -> sets cookie and redirects to /admin/
app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  const pw = req.body && req.body.password;
  if (pw !== ADMIN_PASS) return res.status(403).send('Forbidden');
  const token = makeId();
  SESSIONS[token] = { created: Date.now() };
  // Set cookie valid for 7 days, HttpOnly
  const cookieParts = [`kbspdf_auth=${encodeURIComponent(token)}`, `Max-Age=${7*24*60*60}`, 'HttpOnly', 'Path=/'];
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  res.redirect('/admin/');
});

// Serve admin login page for GET requests (with or without trailing slash)
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});
app.get('/admin/login/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// Admin route protection middleware: if request targets /admin (except /admin/login), require session or basic auth
app.use((req, res, next) => {
  if (!req.path.startsWith('/admin')) return next();
  if (req.path.startsWith('/admin/login')) return next();
  // check basic auth
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Basic ')) {
    const token = auth.split(' ')[1];
    const creds = Buffer.from(token, 'base64').toString();
    if (creds === `${ADMIN_USER}:${ADMIN_PASS}`) return next();
  }
  const cookies = parseCookies(req);
  if (cookies.kbspdf_auth && SESSIONS[cookies.kbspdf_auth]) return next();
  // redirect to login for browsers
  if (req.method === 'GET') return res.redirect('/admin/login/');
  return res.status(403).json({ error: 'Forbidden' });
});

// Serve static files after admin middleware so /admin paths can be intercepted
app.use(express.static(path.join(__dirname, 'public')));

// List PDFs with optional filters
app.get('/api/pdfs', async (req, res) => {
  const all = await readJson(PDFS_FILE);
  const { l1, l2, l3, l4, q } = req.query;
  let filtered = all;
  if (l1) filtered = filtered.filter(x => x.category_l1 === l1);
  if (l2) filtered = filtered.filter(x => x.category_l2 === l2);
  if (l3) filtered = filtered.filter(x => x.category_l3 === l3);
  if (l4) filtered = filtered.filter(x => x.category_l4 === l4);
  if (q) {
    const Q = q.toLowerCase();
    filtered = filtered.filter(x => (x.main_title && x.main_title.toLowerCase().includes(Q)) || (x.subtitle && x.subtitle.toLowerCase().includes(Q)));
  }
  res.json(filtered);
});

app.get('/api/pdfs/:id', async (req, res) => {
  const all = await readJson(PDFS_FILE);
  const rec = all.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  res.json(rec);
});

app.post('/api/pdfs', requireAdmin, async (req, res) => {
  const payload = req.body;
  const errors = validatePdfPayload(payload);
  if (errors.length) return res.status(400).json({ errors });
  const all = await readJson(PDFS_FILE);
  const record = {
    id: makeId(),
    category_l1: payload.category_l1,
    category_l2: payload.category_l2,
    category_l3: payload.category_l3,
    category_l4: payload.category_l4,
    publisher: payload.publisher || '',
    main_title: payload.main_title,
    subtitle: payload.subtitle || '',
    pdf_url: payload.pdf_url,
    upload_date: new Date().toISOString()
  };
  all.unshift(record);
  await writeJson(PDFS_FILE, all);
  res.status(201).json(record);
});

// Delete a PDF record by id
app.delete('/api/pdfs/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const all = await readJson(PDFS_FILE);
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = all.splice(idx, 1)[0];
  await writeJson(PDFS_FILE, all);
  res.json({ ok: true, removed });
});

app.post('/api/requests', async (req, res) => {
  const { requested_title, category_l1, category_l2, category_l3, category_l4, comments, request_type } = req.body;
  if (!requested_title || typeof requested_title !== 'string') return res.status(400).json({ error: 'requested_title required' });
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const rec = {
    id: makeId(),
    ip_address: ip,
    requested_title,
    request_type: request_type || '자료요청',
    category_l1: category_l1 || '',
    category_l2: category_l2 || '',
    category_l3: category_l3 || '',
    category_l4: category_l4 || '',
    comments: comments || '',
    status: 'working',
    created_at: new Date().toISOString()
  };
  const all = await readJson(REQS_FILE);
  all.unshift(rec);
  await writeJson(REQS_FILE, all);
  res.status(201).json({ ok: true, id: rec.id });
});

app.get('/api/requests', requireAdmin, async (req, res) => {
  const all = await readJson(REQS_FILE);
  res.json(all);
});

// Update request status
app.patch('/api/requests/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['working', 'uploaded', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const all = await readJson(REQS_FILE);
  const rec = all.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  rec.status = status;
  await writeJson(REQS_FILE, all);
  res.json({ ok: true });
});

// Delete request
app.delete('/api/requests/:id', requireAdmin, async (req, res) => {
  const all = await readJson(REQS_FILE);
  const idx = all.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = all.splice(idx, 1)[0];
  await writeJson(REQS_FILE, all);
  res.json({ ok: true, removed });
});

(async () => {
  await ensureDataFiles();
  app.listen(PORT, () => {
    console.log(`K-PDF server running on http://localhost:${PORT}`);
  });
})();
