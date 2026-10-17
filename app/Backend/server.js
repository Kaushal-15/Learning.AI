
/**
 * Learning.AI Backend
 * Supports Vercel serverless and traditional Node.js hosting.
 */

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 8080;
const isVercel = Boolean(process.env.VERCEL);

console.log("Learning.AI backend initializing");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("VERCEL:", isVercel);

// Fail clearly if required production configuration is missing.
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("Missing SESSION_SECRET environment variable");
}

if (isVercel) {
  app.set("trust proxy", 1);
}

// CORS
const allowedOrigins = new Set([
  "https://learning-ai-rswf.vercel.app",
  "http://localhost:5173"
]);

if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((url) => allowedOrigins.add(url));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }

      console.warn("CORS blocked origin:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "local-development-only-change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isVercel || process.env.NODE_ENV === "production",
      sameSite: isVercel ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// Passport
const passport = require("./config/passport-config");
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Health checks do not require MongoDB.
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Learning.AI Backend",
    status: "OK"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Learning.AI API"
  });
});

// Database connection
const connectDB = require("./config/database");

connectDB()
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.stack || err.message);
  });

// Application routes
app.use("/api/auth", require("./routes/auth"));
app.use("/auth", require("./routes/googleAuth"));
app.use("/api/content", require("./routes/contentRoutes"));
app.use("/api/roadmaps", require("./routes/roadmapRoutes"));
app.use("/api/daily-learning", require("./routes/dailyLearningRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/xp", require("./routes/xp.routes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/test-results", require("./routes/testResultRoutes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/exams", require("./routes/examRoutes"));

// Unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl
  });
});

// Serve frontend files only when running outside Vercel.
if (!isVercel) {
  const path = require("path");
  const publicPath = path.join(__dirname, "public");

  app.use(express.static(publicPath));

  // Compatible with Express 4 and Express 5.
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(
      path.join(publicPath, "index.html"),
      (err) => {
        if (err) next(err);
      }
    );
  });
}

// Error handler must be last.
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Only start a listener for traditional hosting.
if (!isVercel) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Learning.AI listening on port ${PORT}`);
  });
}

module.exports = app;
