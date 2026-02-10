// ===============================
// Learning.AI Backend Server
// Cloud Run – READY VERSION
// ===============================

// ⚠️ Load dotenv ONLY in non-production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// ===============================
// Initialize App FIRST
// ===============================
const app = express();
const PORT = process.env.PORT || 8080;

// ===============================
// 🔊 BOOT LOGS (CRITICAL FOR CLOUD RUN)
// ===============================
console.log("BOOT: server.js loaded");
console.log("BOOT: NODE_ENV =", process.env.NODE_ENV);
console.log("BOOT: PORT =", PORT);

// ===============================
// Middleware (safe order)
// ===============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===============================
// CORS (safe for demo)
// ===============================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ===============================
// Helmet (CSP disabled for demo)
// ===============================
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// ===============================
// Session (OAuth-safe)
// ===============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "demo-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// ===============================
// Passport (AFTER session)
// ===============================
const passport = require("./config/passport-config");
app.use(passport.initialize());
app.use(passport.session());

// ===============================
// Rate Limiter
// ===============================
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ===============================
// Health Check (Cloud Run)
// ===============================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
  });
});

// ===============================
// Connect DB (SAFE – no crash)
// ===============================
const connectDB = require("./config/database");

connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// ===============================
// Routes
// ===============================
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

// ===============================
// Static Frontend
// ===============================
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// Error Handler (LAST)
// ===============================
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// ===============================
// Start Server (CRITICAL FIX)
// ===============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;
