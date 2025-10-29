// server/server.js
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const connectDB = require("./config/db");

// load env
dotenv.config();

const app = express();

/* ---------- Minimal boot logging (safe) ---------- */
try {
  const cloudinary = require("./config/cloudinary");
  console.log("Cloudinary:", cloudinary.config().cloud_name || "(no cloud name)");
} catch {
  console.log("Cloudinary: not configured");
}

/* ---------- Core middleware (order matters) ---------- */
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* ---------- CORS (allow exact domains + *.vercel.app previews) ---------- */
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl
  if (allowed.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true; // previews
  } catch {}
  return false;
}

app.use(
  cors({
    origin(origin, cb) {
      return isAllowedOrigin(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());


app.use(morgan("dev"));

/* ---------- Fast ping (no DB) ---------- */
app.get(["/api/ping", "/ping"], (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, pong: true, time: Date.now() });
});

/* ---------- Health (touches DB lazily) ---------- */
// Replace your /health route with this:
app.get(["/api/v1/health", "/health"], async (_req, res) => {
  let db = "unknown";
  const tryConnect = (async () => {
    try {
      await connectDB();
      return (mongoose.connection.readyState === 1) ? "connected" : String(mongoose.connection.readyState);
    } catch (e) {
      return "error: " + (e?.message || String(e));
    }
  })();

  const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 2500));
  db = await Promise.race([tryConnect, timeout]);

  res.set("Cache-Control", "no-store");
  res.json({ ok: true, service: "ocean-stella-api", db });
});


/* ---------- Attach user from access-token cookie (optional) ---------- */
app.use((req, _res, next) => {
  const at = req.cookies?.os_at;
  if (!at) return next();
  try {
    const payload = jwt.verify(at, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // ignore invalid/expired
  }
  next();
});

/* ---------- API routes ---------- */
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/case-studies", require("./routes/caseStudies"));
app.use("/api/v1/blog", require("./routes/blog"));
app.use("/api/v1/leads", require("./routes/leads"));
app.use("/api/v1/inquiries", require("./routes/inquiries"));
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/upload", require("./routes/upload.routes"));
app.use("/api/users", require("./routes/user")); // PATCH /me/avatar, etc.

/* ---------- Start / Export ---------- */
const PORT = process.env.PORT || 8080;

// ⚠️ Do NOT auto-connect on cold start in serverless.
// Connect lazily inside routes. For local dev only, you can pre-connect:
if (!process.env.VERCEL) {
  connectDB().catch((e) => console.error("❌ Mongo connect error:", e.message));
}

if (process.env.VERCEL) {
  module.exports = app; // used by api/index.js (serverless)
} else {
  app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
}
