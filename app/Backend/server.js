
/**
 * Learning.AI Backend
 * Supports Vercel and traditional Node.js hosting.
 */

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

const app = express();
const PORT = process.env.PORT || 8080;

console.log("Learning.AI backend starting");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("VERCEL:", process.env.VERCEL || "false");

// Trust Vercel's proxy for secure cookies and client IP handling.
if (process.env.VERCEL) {
  app.set("trust proxy", 1);
}

// CORS must run before routes and error handlers.
const allowedOrigins = [
  "https://learning-ai-rswf.vercel.app",
  "http://localhost:5173"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.FRONTEND_URLS) {
  allowedOrigins.push(
    ...process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin include server-to-server and health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// Passport must be initialized after the session middleware.
const passport = require("./config/passport-config");
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting.
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Health endpoints.
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

// Database connection.
const connectDB = require("./config/database");

connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// Existing application routes.
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

// Unknown API paths must not fall through to frontend HTML.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl
  });
});

// Optional static frontend for traditional hosting only.
if (!process.env.VERCEL) {
  const publicPath = path.join(__dirname, "public");

  app.use(express.static(publicPath));

  app.get("*", (req, res, next) => {
    res.sendFile(path.join(publicPath, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

// Error handler must be last.
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Traditional hosting starts a listener.
// Vercel invokes the exported Express app as a function.
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Learning.AI listening on port ${PORT}`);
  });
}

module.exports = app;
