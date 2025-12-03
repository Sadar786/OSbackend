// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

// Load .env
dotenv.config();

const app = express();

/* -------------------------------------------------- */
/* 1. Essential Middlewares (ORDER IS IMPORTANT)      */
/* -------------------------------------------------- */
app.use(cookieParser());

// Must be BEFORE routes
app.use(express.json({ limit: "2mb" }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------------------------------------- */
/* 2. Helmet (SAFE MODE — allows cross-origin cookies)*/
/* -------------------------------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false, // MUST be false for cookies
  })
);

/* -------------------------------------------------- */
/* 3. CORS — allow Vercel frontends + previews        */
/* -------------------------------------------------- */
const FRONTENDS = [
  "https://oceanstella.vercel.app", // Production frontend
];

// Use regex to allow preview deployments (*.vercel.app)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow same-origin requests (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Exact production domain
      if (FRONTENDS.includes(origin)) return callback(null, true);

      // Preview URLs
      try {
        const { hostname } = new URL(origin);
        if (hostname.endsWith(".vercel.app")) return callback(null, true);
      } catch {}

      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true, // 🔥 REQUIRED for cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors());

/* -------------------------------------------------- */
/* 4. Logger                                          */
/* -------------------------------------------------- */
app.use(morgan("dev"));

/* -------------------------------------------------- */
/* 5. Quick Health Check                              */
/* -------------------------------------------------- */
app.get("/health", async (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* -------------------------------------------------- */
/* 6. Auto attach user from access token cookie       */
/* -------------------------------------------------- */
app.use((req, _res, next) => {
  const at = req.cookies?.os_at;
  if (!at) return next();

  try {
    const payload = jwt.verify(at, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
  } catch {}
  next();
});

/* -------------------------------------------------- */
/* 7. API Routes                                      */
/* -------------------------------------------------- */
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/blog", require("./routes/blog"));
app.use("/api/v1/inquiries", require("./routes/inquiries"));
app.use("/api/v1/leads", require("./routes/leads"));
app.use("/api/v1/case-studies", require("./routes/caseStudies"));
app.use("/api/users", require("./routes/user"));
app.use("/api/upload", require("./routes/upload.routes"));

/* -------------------------------------------------- */
/* 8. Start Server (Render keeps dyno alive)           */
/* -------------------------------------------------- */
const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

app.listen(PORT, () =>
  console.log(`🚀 Ocean Stella API running on http://localhost:${PORT}`)
);
