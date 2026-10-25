require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'uploads');
for (const dir of [DATA, UPLOADS]) fs.mkdirSync(dir, { recursive: true });
const siteFile = path.join(DATA, 'site.json');
const tracksFile = path.join(DATA, 'tracks.json');
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const safeName = (name) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(session({
  name: 'tomk.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
app.use('/uploads', express.static(UPLOADS, { fallthrough: false, maxAge: '1h' }));
app.use(express.static(path.join(ROOT, 'public')));

const audioStorage = multer.diskStorage({ destination: UPLOADS, filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName(file.originalname)}`) });
const imageStorage = multer.diskStorage({ destination: UPLOADS, filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName(file.originalname)}`) });
const audioUpload = multer({ storage: audioStorage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname) && /^audio\//i.test(file.mimetype) || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname)) });
const imageUpload = multer({ storage: imageStorage, limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) });
const requireAdmin = (req, res, next) => req.session && req.session.isAdmin ? next() : res.status(401).json({ error: 'Vui lòng đăng nhập quản trị.' });

app.get('/api/site', (req, res) => res.json(readJson(siteFile, {})));
app.get('/api/tracks', (req, res) => res.json(readJson(tracksFile, [])));
app.get('/api/auth/status', (req, res) => res.json({ loggedIn: !!(req.session && req.session.isAdmin) }));
app.post('/api/auth/login', (req, res) => {
  const username = process.env.ADMIN_USERNAME || 'tomk';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const suppliedUser = String(req.body.username || '');
  const suppliedPass = String(req.body.password || '');
  const ok = suppliedUser === username && suppliedPass === password;
  if (!ok) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' });
  req.session.regenerate(err => { if (err) return res.status(500).json({ error: 'Không tạo được phiên đăng nhập.' }); req.session.isAdmin = true; res.json({ ok: true }); });
});
app.post('/api/auth/logout', requireAdmin, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.put('/api/site', requireAdmin, (req, res) => {
  const old = readJson(siteFile, {});
  const allowed = ['brand', 'tagline', 'heroTitle', 'heroSubtitle', 'accent', 'logo', 'banner'];
  const next = { ...old };
  for (const key of allowed) if (typeof req.body[key] === 'string') next[key] = req.body[key].slice(0, key === 'heroSubtitle' ? 500 : 120);
  if (!/^#[0-9a-fA-F]{6}$/.test(next.accent)) return res.status(400).json({ error: 'Mã màu không hợp lệ.' });
  writeJson(siteFile, next); res.json(next);
});
app.post('/api/upload/image', requireAdmin, (req, res) => imageUpload.single('image')(req, res, err => {
  if (err) return res.status(400).json({ error: err.message || 'Ảnh không hợp lệ hoặc vượt quá 12MB.' });
  if (!req.file) return res.status(400).json({ error: 'Chưa chọn ảnh.' });
  res.json({ url: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
}));
app.post('/api/tracks', requireAdmin, (req, res) => audioUpload.single('audio')(req, res, err => {
  if (err) return res.status(400).json({ error: err.message || 'File nhạc không hợp lệ hoặc vượt quá 100MB.' });
  if (!req.file) return res.status(400).json({ error: 'Chưa chọn file nhạc.' });
  const tracks = readJson(tracksFile, []);
  const track = { id: crypto.randomUUID(), title: String(req.body.title || path.parse(req.file.originalname).name).slice(0, 140), artist: String(req.body.artist || 'DJ TOMK').slice(0, 100), genre: String(req.body.genre || 'VinaHouse').slice(0, 80), cover: String(req.body.cover || '').slice(0, 500), audio: `/uploads/${req.file.filename}`, filename: req.file.originalname, createdAt: new Date().toISOString() };
  tracks.unshift(track); writeJson(tracksFile, tracks); res.status(201).json(track);
}));
app.patch('/api/tracks/:id', requireAdmin, (req, res) => {
  const tracks = readJson(tracksFile, []); const i = tracks.findIndex(t => t.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Không tìm thấy bài nhạc.' });
  for (const key of ['title', 'artist', 'genre', 'cover']) if (typeof req.body[key] === 'string') tracks[i][key] = req.body[key].slice(0, 500);
  writeJson(tracksFile, tracks); res.json(tracks[i]);
});
app.delete('/api/tracks/:id', requireAdmin, (req, res) => {
  const tracks = readJson(tracksFile, []); const track = tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Không tìm thấy bài nhạc.' });
  writeJson(tracksFile, tracks.filter(t => t.id !== req.params.id));
  for (const url of [track.audio, track.cover]) if (url && url.startsWith('/uploads/')) { const file = path.join(UPLOADS, path.basename(url)); if (fs.existsSync(file)) fs.unlinkSync(file); }
  res.json({ ok: true });
});
app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`DJ TOMK website running at http://localhost:${port}`));
