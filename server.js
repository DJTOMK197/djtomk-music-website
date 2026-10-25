const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TOMK-change-me";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_DIR = path.join(ROOT, "data");
const TRACKS_FILE = path.join(DATA_DIR, "tracks.json");

for (const dir of [UPLOAD_DIR, DATA_DIR]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(TRACKS_FILE)) fs.writeFileSync(TRACKS_FILE, "[]\n");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

function readTracks() {
  try {
    const parsed = JSON.parse(fs.readFileSync(TRACKS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeTracks(tracks) {
  fs.writeFileSync(TRACKS_FILE, JSON.stringify(tracks, null, 2));
}
function parseCookies(req) {
  const result = {};
  (req.headers.cookie || "").split(";").forEach(part => {
    const idx = part.indexOf("=");
    if (idx > -1) result[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return result;
}
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}
function adminRequired(req, res, next) {
  const token = parseCookies(req).tomk_admin;
  if (!token || !token.includes(".")) return res.status(401).json({ error: "Bạn cần đăng nhập quản trị." });
  const [id, signature] = token.split(".");
  const expected = sign(id);
  const a = Buffer.from(signature || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ." });
  }
  next();
}
app.get("/api/health", (_req, res) => res.json({ ok: true, name: "DJ TOMK", version: "1.0.0" }));
app.get("/api/tracks", (_req, res) => {
  const tracks = readTracks().map(({ id, title, artist, genre, cover, audio, createdAt }) =>
    ({ id, title, artist, genre, cover, audio, createdAt }));
  res.json(tracks);
});
app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Mật khẩu chưa đúng." });
  const id = crypto.randomBytes(24).toString("hex");
  const token = `${id}.${sign(id)}`;
  res.setHeader("Set-Cookie", `tomk_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${req.secure ? "; Secure" : ""}`);
  res.json({ ok: true });
});
app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "tomk_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});
app.get("/api/admin/tracks", adminRequired, (_req, res) => res.json(readTracks()));
app.post("/api/admin/tracks", adminRequired, (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 160);
  const artist = String(req.body.artist || "DJ TOMK").trim().slice(0, 120);
  const genre = String(req.body.genre || "VinaHouse").trim().slice(0, 80);
  const audio = String(req.body.audio || "").trim().slice(0, 1000);
  const cover = String(req.body.cover || "").trim().slice(0, 1000);
  if (!title || !audio) return res.status(400).json({ error: "Cần nhập tên bài và đường dẫn nhạc." });
  if (!/^https?:\/\//i.test(audio) && !audio.startsWith("/uploads/")) {
    return res.status(400).json({ error: "Đường dẫn nhạc phải là URL http(s) hoặc đường dẫn /uploads/." });
  }
  const tracks = readTracks();
  const track = { id: crypto.randomUUID(), title, artist, genre, audio, cover, createdAt: new Date().toISOString() };
  tracks.unshift(track);
  writeTracks(tracks);
  res.status(201).json(track);
});
app.delete("/api/admin/tracks/:id", adminRequired, (req, res) => {
  const tracks = readTracks();
  const next = tracks.filter(track => track.id !== req.params.id);
  if (next.length === tracks.length) return res.status(404).json({ error: "Không tìm thấy bài nhạc." });
  writeTracks(next);
  res.json({ ok: true });
});
app.get("/admin", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin.html")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API không tồn tại." });
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), err => {
    if (err) next(err);
  });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ." });
});
app.listen(PORT, "0.0.0.0", () => console.log(`DJ TOMK website listening on port ${PORT}`));
