// ===============================
// Learning.AI Backend Server
// ===============================
// CRITICAL: Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport-config');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const requestLogger = require('./middleware/requestLogger');
const authMiddleware = require('./middleware/authMiddleware');

// ===============================
// Import routes
// ===============================
const questionRoutes = require('./routes/questionRoutes');
const testResultRoutes = require('./routes/testResultRoutes');
const quizRoutes = require('./routes/quizRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const learnerRoutes = require('./routes/learnerRoutes');
const profileRoutes = require('./routes/profileRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const roadmapRoutes = require('./routes/roadmapRoutes');
const progressRoutes = require('./routes/progressRoutes');
const dailyLearningRoutes = require('./routes/dailyLearningRoutes');
const contentRoutes = require('./routes/contentRoutes');
const userRoutes = require('./routes/userRoutes');
const roadmapSelectionRoutes = require('./routes/roadmapSelectionRoutes');
const newProgressRoutes = require('./routes/progress.routes');
const xpRoutes = require('./routes/xp.routes');
const projectRoutes = require('./routes/project.routes');
const customLearningRoutes = require('./routes/customLearningRoutes');
const examRoutes = require('./routes/examRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const cameraRoutes = require('./routes/cameraRoutes');


// ===============================
// Initialize App
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Connect to MongoDB
// ===============================
connectDB();

// ===============================
// 🧠 COOKIE + CORS SETUP (critical for login/session)
// ===============================
app.use(cookieParser());

// DEBUG: Check if cookie is received
app.get("/debug/cookies", (req, res) => {
  console.log("Cookies:", req.cookies);
  res.json({
    cookies: req.cookies,
    hasAccessToken: !!req.cookies.accessToken,
    hasRefreshToken: !!req.cookies.refreshToken,
  });
});

// ✅ Configure CORS *before* Helmet or routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  })
);

// ===============================
// Security Middleware
// ===============================
// ⚠️ Keep Helmet AFTER CORS during local dev, or it can block cookies
app.use(helmet());

// ===============================
// Session + Passport Middleware (for OAuth)
// ===============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ===============================
// Core Middleware
// ===============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(logger);

// ===============================
// Rate Limiting
// ===============================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ===============================
// Health Check Endpoint
// ===============================
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ===============================
// PUBLIC ROUTES (No Auth Required)
// ===============================
app.use('/api/auth', authRoutes); // signup/login/logout
app.use('/auth', googleAuthRoutes); // Google OAuth routes
app.use('/api/content', contentRoutes); // Content generation (public for testing)
app.use('/api/roadmaps', roadmapRoutes); // Roadmaps (public for viewing)
app.use('/api/daily-learning', dailyLearningRoutes); // Daily learning (public for viewing)

// ===============================
// PROTECTED ROUTES (Require Login)
// ===============================
app.use('/api/users', userRoutes); // User profile and settings
app.use('/api/roadmap-selection', authMiddleware, roadmapSelectionRoutes); // Roadmap selection and changes
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/progress', authMiddleware, progressRoutes); // Legacy progress routes
app.use('/api/progress-tracking', authMiddleware, newProgressRoutes); // New XP-based progress tracking
app.use('/api/xp', authMiddleware, xpRoutes); // XP and League system
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/quiz', authMiddleware, quizRoutes); // Dynamic MCQ Quiz system
app.use('/api/test-results', authMiddleware, testResultRoutes);
app.use('/api/assessment', authMiddleware, assessmentRoutes);
app.use('/api/learners', authMiddleware, learnerRoutes);
app.use('/api/performance', authMiddleware, performanceRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/custom-learning', customLearningRoutes); // Auth handled in routes
app.use('/api/exams', examRoutes);
app.use('/api/biometric', biometricRoutes); // Biometric verification
app.use('/api/camera', cameraRoutes); // Camera monitoring and recording

// ===============================
// 404 Handler
// ===============================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});




// ===============================
// Global Error Handler
// ===============================
app.use(errorHandler);

// ===============================
// Start Server
// ===============================
const { initScheduler } = require('./services/schedulerService');

// Initialize Scheduler
initScheduler();

app.listen(PORT, () => {
  console.log(
    ` Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
  );
  console.log(` Connected to MongoDB`);
});

module.exports = app;
