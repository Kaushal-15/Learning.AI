/**
 * Learning.AI Backend
 * Supports Vercel serverless and traditional Node.js hosting.
 *
 * Middleware order (important for correctness and performance):
 *   1. Trust proxy (must be first for rate-limiter IP detection)
 *   2. CORS
 *   3. Helmet
 *   4. Rate limiters  ← moved before session/passport so blocked requests are cheap
 *   5. Body parsers
 *   6. Cookie parser
 *   7. Session (MongoStore)
 *   8. Passport
 *   9. Health routes (no DB dependency)
 *  10. DB middleware (ensure connection before any data routes)
 *  11. Application routes (with crash-safe loader)
 *  12. 404 catcher for /api
 *  13. Static serving + SPA fallback (non-Vercel only)
 *  14. Error handler (must be last)
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 8080;
const isVercel = Boolean(process.env.VERCEL);
const isProd = isVercel || process.env.NODE_ENV === 'production';

console.log('Learning.AI backend initializing');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', isVercel);

// ---------------------------------------------------------------------------
// 1. Trust proxy
// ---------------------------------------------------------------------------
if (isProd) {
  // Required for express-rate-limit to see the real client IP behind Vercel's
  // edge and for secure cookies set over HTTPS.
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// 2. CORS — must come before everything so preflight OPTIONS are handled.
// ---------------------------------------------------------------------------
const allowedOrigins = new Set([
  'https://learning-ai-rswf.vercel.app',
  'http://localhost:5173'
]);

if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .forEach((url) => allowedOrigins.add(url));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }

      // Return false (not an error) so the request still gets a response,
      // just without Access-Control-Allow-Origin. Throwing here causes a 500.
      console.warn('CORS blocked origin:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// End unhandled OPTIONS requests (e.g. preflights blocked by CORS) without reaching DB or data routes
app.options('*', (req, res) => res.status(204).end());

// ---------------------------------------------------------------------------
// 3. Helmet
// ---------------------------------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));

// ---------------------------------------------------------------------------
// 4. Rate limiters (before session/passport — blocked requests pay no session cost)
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' }
});

app.use('/auth/', authLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// 5. Body parsers — 4 MB cap; Vercel hard-limits bodies at ~4.5 MB
// ---------------------------------------------------------------------------
app.use(
  express.json({
    limit: '4mb',
    // Return 413 JSON (not Express default HTML) when body is too large.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large. Maximum is 4 MB.'
    });
  }
  next(err);
});
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// 6-7. Session — MongoStore once connect-mongo is available; MemoryStore in CI
// ---------------------------------------------------------------------------
let sessionStore;

if (process.env.MONGODB_URI) {
  // Use MongoStore in production/staging to survive serverless cold starts.
  try {
    const cm = require('connect-mongo');
    const MongoStore = cm.default || cm.MongoStore || cm;
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
      collectionName: 'sessions',
      // Lazy connect — avoids blocking startup if DB is slow.
      autoRemove: 'native'
    });
    console.log('✅ Using MongoStore for sessions');
  } catch (err) {
    console.warn('⚠️  connect-mongo not available, falling back to MemoryStore:', err.message);
  }
}

if (!sessionStore) {
  console.warn('⚠️  Using MemoryStore — not suitable for production with multiple instances');
}

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      'local-development-only-change-this-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true,             // Trust the first proxy (required for secure cookies)
    store: sessionStore,     // undefined → MemoryStore (Express default)
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// ---------------------------------------------------------------------------
// 8. Passport
// ---------------------------------------------------------------------------
const passport = require('./config/passport-config');
app.use(passport.initialize());
app.use(passport.session());

// ---------------------------------------------------------------------------
// 9. Health routes — no DB dependency; always 200 even if DB is down
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Learning.AI Backend',
    status: 'OK'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Learning.AI API'
  });
});

// DB health check — pings the live connection
app.get('/api/health/db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      // Attempt a connection so a cold-start gets a real result.
      const connectDB = require('./config/database');
      await connectDB();
    }
    await mongoose.connection.db.admin().ping();
    res.status(200).json({
      status: 'OK',
      db: 'connected',
      host: mongoose.connection.host
    });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: err.message
    });
  }
});

// ---------------------------------------------------------------------------
// 10. DB middleware — ensures a connection is open before any data route runs.
//     Health routes above are exempt (they return before reaching this).
// ---------------------------------------------------------------------------
const connectDB = require('./config/database');
const HEALTH_PATHS = new Set(['/', '/health', '/api/health', '/api/health/db']);

app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS' || HEALTH_PATHS.has(req.path)) return next();

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed for request:', req.originalUrl, err.message);
    return res.status(503).json({
      success: false,
      message: 'Database unavailable'
    });
  }
});

// ---------------------------------------------------------------------------
// 11. Application routes — wrapped in a crash-safe loader.
//     If any route module throws at require() time, a 503 stub is mounted
//     for that prefix instead of crashing the whole server.
// ---------------------------------------------------------------------------
const safeMount = (app, prefix, modulePath) => {
  try {
    app.use(prefix, require(modulePath));
  } catch (err) {
    console.error(`❌ Failed to load route "${prefix}" from "${modulePath}":`, err.message);
    app.use(prefix, (req, res) => {
      res.status(503).json({
        success: false,
        message: `Route "${prefix}" is temporarily unavailable.`,
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    });
  }
};

safeMount(app, '/api/auth', './routes/auth');
safeMount(app, '/auth', './routes/googleAuth');
safeMount(app, '/api/content', './routes/contentRoutes');
safeMount(app, '/api/roadmaps', './routes/roadmapRoutes');
safeMount(app, '/api/daily-learning', './routes/dailyLearningRoutes');
safeMount(app, '/api/users', './routes/userRoutes');
safeMount(app, '/api/profile', './routes/profileRoutes');
safeMount(app, '/api/progress', './routes/progressRoutes');
safeMount(app, '/api/xp', './routes/xp.routes');
safeMount(app, '/api/questions', './routes/questionRoutes');
safeMount(app, '/api/quiz', './routes/quizRoutes');
safeMount(app, '/api/test-results', './routes/testResultRoutes');
safeMount(app, '/api/projects', './routes/project.routes');
safeMount(app, '/api/exams', './routes/examRoutes');

// ---------------------------------------------------------------------------
// 12. Unknown API routes — 404 JSON (must come after all /api/* route mounts)
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// ---------------------------------------------------------------------------
// 13. Serve frontend files only when running outside Vercel.
// ---------------------------------------------------------------------------
if (!isVercel) {
  const path = require('path');
  const publicPath = path.join(__dirname, 'public');

  app.use(express.static(publicPath));

  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// ---------------------------------------------------------------------------
// 14. Error handler — must be the very last middleware
// ---------------------------------------------------------------------------
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start listener only for traditional hosting (not Vercel serverless)
// ---------------------------------------------------------------------------
if (!isVercel) {
  // Only start scheduler on traditional hosts (cron does not work on Vercel)
  try {
    const { initScheduler } = require('./services/schedulerService');
    initScheduler();
  } catch (err) {
    console.warn('Scheduler init failed (non-fatal):', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Learning.AI listening on port ${PORT}`);
  });
}

module.exports = app;
