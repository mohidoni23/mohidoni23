const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

for (const dir of [DATA_DIR, UPLOADS_DIR, PUBLIC_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Simple JSON storage helpers
async function readJson(fileName, defaultValue) {
  const fullPath = path.join(DATA_DIR, fileName);
  try {
    const content = await fsp.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeJson(fileName, defaultValue);
      return defaultValue;
    }
    throw err;
  }
}

async function writeJson(fileName, data) {
  const fullPath = path.join(DATA_DIR, fileName);
  await fsp.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Seed counselor account if not exists
async function ensureSeedUser() {
  const users = await readJson('users.json', []);
  const counselorEmail = 'mzhganasdyanzadh@gmail.com';
  const existing = users.find(u => u.email.toLowerCase() === counselorEmail.toLowerCase());
  if (!existing) {
    const passwordHash = await bcrypt.hash('MohiDoni23', 10);
    const counselorUser = {
      id: uuidv4(),
      username: 'مشاور',
      email: counselorEmail,
      role: 'counselor',
      passwordHash,
      createdAt: new Date().toISOString()
    };
    users.push(counselorUser);
    await writeJson('users.json', users);
    const profiles = await readJson('profiles.json', []);
    profiles.push({ userId: counselorUser.id, firstName: 'مشاور', lastName: 'مدرسه', phone: process.env.COUNSELOR_PHONE || '', bio: '' });
    await writeJson('profiles.json', profiles);
  }
}

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Auth routes
app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const users = await readJson('users.json', []);
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = { id: uuidv4(), username, email, role: 'student', passwordHash, createdAt: new Date().toISOString() };
  users.push(newUser);
  await writeJson('users.json', users);

  const profiles = await readJson('profiles.json', []);
  profiles.push({ userId: newUser.id, firstName: username, lastName: '', phone: '', bio: '' });
  await writeJson('profiles.json', profiles);

  // Send SMS notification (best-effort)
  try {
    const { sendRegistrationSms } = require('./services/notify');
    await sendRegistrationSms(newUser);
  } catch (e) {
    console.warn('SMS notification skipped:', e.message);
  }

  req.session.user = { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role };
  res.json({ ok: true });
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const users = await readJson('users.json', []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
  res.json({ ok: true });
});

app.post('/api/signout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Reports
app.post('/api/reports', requireAuth, upload.single('image'), async (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit reports' });
  }
  const { title, content } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
  const reports = await readJson('reports.json', []);
  const report = { id: uuidv4(), studentId: req.session.user.id, title: title || '', content: content || '', imagePath, createdAt: new Date().toISOString() };
  reports.push(report);
  await writeJson('reports.json', reports);
  res.json({ ok: true, report });
});

app.get('/api/reports/mine', requireAuth, async (req, res) => {
  const reports = await readJson('reports.json', []);
  const mine = reports.filter(r => r.studentId === req.session.user.id);
  res.json({ reports: mine });
});

app.get('/api/reports', requireRole('counselor'), async (req, res) => {
  const reports = await readJson('reports.json', []);
  res.json({ reports });
});

app.get('/api/reports/stats', requireRole('counselor'), async (req, res) => {
  const reports = await readJson('reports.json', []);
  const byDay = {};
  for (const r of reports) {
    const day = (r.createdAt || '').slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  const labels = Object.keys(byDay).sort();
  const data = labels.map(d => byDay[d]);
  res.json({ labels, data, total: reports.length });
});

// Ask counselor
app.post('/api/ask', requireAuth, upload.single('image'), async (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can ask' });
  }
  const { question } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
  const asks = await readJson('asks.json', []);
  const entry = { id: uuidv4(), studentId: req.session.user.id, question: question || '', imagePath, createdAt: new Date().toISOString() };
  asks.push(entry);
  await writeJson('asks.json', asks);
  res.json({ ok: true, ask: entry });
});

app.get('/api/ask', requireRole('counselor'), async (req, res) => {
  const asks = await readJson('asks.json', []);
  res.json({ asks });
});

// Profiles
app.get('/api/students', requireRole('counselor'), async (req, res) => {
  const users = await readJson('users.json', []);
  const students = users.filter(u => u.role === 'student').map(u => ({ id: u.id, username: u.username, email: u.email }));
  res.json({ students });
});

app.get('/api/students/:id/profile', requireAuth, async (req, res) => {
  const { id } = req.params;
  const me = req.session.user;
  if (me.role !== 'counselor' && me.id !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const profiles = await readJson('profiles.json', []);
  const profile = profiles.find(p => p.userId === id) || null;
  res.json({ profile });
});

app.put('/api/students/:id/profile', requireRole('counselor'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const profiles = await readJson('profiles.json', []);
  const idx = profiles.findIndex(p => p.userId === id);
  if (idx === -1) {
    profiles.push({ userId: id, ...updates });
  } else {
    profiles[idx] = { ...profiles[idx], ...updates };
  }
  await writeJson('profiles.json', profiles);
  res.json({ ok: true });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

ensureSeedUser().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
