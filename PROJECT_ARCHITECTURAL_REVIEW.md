# Learning.AI — System Architecture, Feature Directory & Senior Technical Roadmap
*Comprehensive Production Readiness Review & Full-Stack Blueprint*

**Author:** Senior Full-Stack Cloud Solutions Architect  
**Version:** 1.0.0  
**Scope:** Architecture Audit, Proctoring Infrastructure, Adaptive Testing & Full-Stack Production Hardening  
**Live Target Deployment:**
- **Frontend SPA:** [https://learning-ai-rswf.vercel.app](https://learning-ai-rswf.vercel.app) (Vite / React 18 / Tailwind)
- **Backend API:** [https://learning-ai-mocha.vercel.app](https://learning-ai-mocha.vercel.app) (Node.js 22 / Express 4 / Mongoose 7 / Vercel Serverless)
- **Database Store:** MongoDB Atlas Replica Set (Database: `learning-ai`)

---

## 1. Executive Summary & Current Architecture Baseline

**Learning.AI** is an advanced AI-powered learning and proctored examination platform designed for personalized skill acquisition, adaptive testing, and integrity-verified student assessments.

### Key Milestones Achieved (Production Fixes)
1. **Serverless Connection Lifecycle Optimization:** Reordered Express middlewares in `app/Backend/server.js` so that `connectDB()` resolves and verifies `readyState === 1` *before* `express-session`, `passport`, or any API routes execute. This permanently resolved the `Operation 'users.findOne()' buffering timed out after 10000ms` error.
2. **Defensive Controller Guards:** Added explicit `await connectDB()` in `authController.js` (`register`, `verifyOTP`, `loginUser`) and `passport-config.js` (`deserializeUser`) to eliminate race conditions during cold starts.
3. **Mongoose Fast-Fail Configuration:** Enabled `mongoose.set('bufferCommands', false)` to prevent silent 10-second query hangs.
4. **Dark Mode UI Overhaul:** Configured proper slate/neutral dark theme color tokens (`#0f172a`, `#1e293b`, `#334155`) across `index.html` and `DevvoraStyles.css`, eliminating pitch black and low-contrast palettes.
5. **Route Mounting & Edge Rewrites:** Mounted all specialized backend routes and configured Vercel edge rewrites in `app/frontend/vercel.json` (`/api/*` and `/auth/*` pointing to `learning-ai-mocha.vercel.app`).

---

## 2. Platform Domain & Feature Directory

### 2.1 Adaptive Testing & Dynamic MCQ Engine
- **Difficulty Calibration Engine (`AdaptiveDifficultyEngine.js`):** Continuously recalculates learner ability and scales subsequent question difficulty.
- **Adaptive Exam Session Runner (`AdaptiveExamSession.jsx`, `adaptiveExamController.js`):** Manages examination state, question timers, pagination, question branching, and score computation.
- **Dynamic MCQ Routing (`AdaptiveRoutingConfig.jsx`, `AdaptiveWaitScreen.jsx`):** Enables smooth transitions between question pools without full page reloads, resilient against network fluctuations.

### 2.2 AI Biometric Proctoring & Camera Surveillance
- **Biometric Identity Capture (`BiometricCapture.jsx`):** Captures candidate facial snapshots during onboarding and exam entry, validating identity against baseline records.
- **Real-Time Camera Proctoring (`CameraMonitor.jsx`, `cameraRoutes.js`):** Monitors candidate webcams continuously during live exams and dispatches chunked WebM video streams.
- **Admin Biometric Verification (`AdminBiometricApproval.jsx`, `BiometricApproval.jsx`):** Allows proctors and exam administrators to approve, reject, or flag candidate biometric captures before exams commence.

### 2.3 Interactive Curriculum, Skill Roadmaps & Gamification
- **Domain Roadmaps (`Roadmap.jsx`, `LearnPaths.jsx`):** Structured skill tracks for Full-Stack Development, Frontend, Backend, AI/ML, Mobile, DevOps, and Data Science.
- **Lesson Explorer (`LessonDetail.jsx`, `ContentViewer.jsx`):** In-depth curriculum reader covering theoretical concepts, code snippets, and interactive exercises.
- **XP & Gamification (`xp.service.js`, `xp.routes.js`):** Computes experience points, study streaks, and level progression to sustain learner engagement.

### 2.4 Custom Learning & Personalized Question Engine
- **Personalized Question Sets (`PersonalizedQuestionSetService.js`):** Synthesizes custom tests specifically targeting historical student weakness areas.
- **Custom Quiz Builder (`CustomLearning.jsx`, `CustomQuizHistory.jsx`):** Enables learners to configure custom quizzes with tailored topics and difficulty parameters.

### 2.5 Admin Operations, Exam Creation & Live Monitoring
- **Visual Exam Authoring Studio (`AdminExamCreate.jsx`, `AdminExamManage.jsx`):** Full-featured exam builder with CSV question import, pass thresholds, time limits, and proctoring policy configuration.
- **Live Monitoring Dashboard (`ExamMonitor.jsx`, `ExamDashboard.jsx`):** Live telemetry of active candidate sessions, connection statuses, warnings, and biometric discrepancies.
- **Performance Analytics (`AnalyticsDashboard.jsx`, `ExamAnalytics.jsx`):** Cohort performance metrics, question discrimination indices, and timing distribution curves.

### 2.6 Authentication, Multi-Provider Identity & Security
- **Local Authentication:** Salted SHA-256 password hashing with server-side pepper and 6-digit email OTP verification.
- **Google OAuth 2.0:** One-click authentication with Google accounts, auto-provisioning linked Learner and User records.
- **Token Management:** Stateless JWT access tokens + cryptographically signed refresh tokens with automated rotation and cross-domain cookie handling.

---

## 3. Senior Architectural Evaluation & Gap Analysis

| Subsystem / Area | Severity | Current Implementation Detail | Architectural Remedy |
| :--- | :--- | :--- | :--- |
| **Video Proctoring Storage** | **CRITICAL** | `recordingService.js` writes video chunks to local disk via `fs.appendFile` into `app/Backend/uploads/recordings`. Fails on Vercel's read-only ephemeral filesystem. | Migrate to direct-to-cloud upload using Presigned S3/Cloudflare R2 URLs. Frontend streams chunks directly to cloud object storage. |
| **Database Seeding** | **HIGH** | Empty collections in MongoDB Atlas (e.g., `roadmaps`, `questions`) cause public endpoints like `/api/roadmaps/frontend` to return 404. | Deploy an automated idempotent migration script (`scripts/seed-roadmaps.js`) executed automatically during initial deployment. |
| **Frontend Styling Assets** | **HIGH** | `index.html` imports Tailwind CSS via CDN script (`https://cdn.tailwindcss.com`). Triggers production console warnings and slows First Contentful Paint (FCP). | Install Tailwind CSS as a PostCSS plugin in Vite. Build static, purged utility CSS into the bundle. |
| **Session Layer vs. Stateless JWT** | **MEDIUM** | `express-session` with `MongoStore` was required for Passport Google OAuth, incurring database handshake overhead on serverless cold starts. | Transition Google OAuth flow to exchange OAuth codes directly for JWTs, completely decoupling serverless APIs from stateful session stores. |
| **Rate Limiting Configuration** | **MEDIUM** | Global rate limiter in `server.js` restricts `/api/` to 100 requests / 15 minutes. High-frequency proctoring telemetry risks triggering false 429 errors. | Segment rate limits: strict limits on `/api/auth/*`, relaxed high-throughput allowances for `/api/camera/*` and proctoring telemetry. |
| **Repository Clutter** | **LOW** | Backup files exist in the repository (e.g. `Dashboard.backup.jsx`, `Learn.jsx.backup`, `check_exam.js`). | Purge legacy backup files; leverage Git version control history for tracking earlier iterations. |

---

## 4. Actionable Production Blueprint (Phased Roadmap)

### Phase 1: Immediate Stabilization & Reliability (Week 1)
1. **S3 / Cloudflare R2 Object Storage Adapter:** Replace local disk chunking with presigned multi-part S3/R2 upload URLs. Candidate browsers stream WebM chunks directly to cloud buckets.
2. **Database Seeder Execution:** Populate standard curriculum data in the `roadmaps` collection and default question banks.
3. **Vite PostCSS Tailwind Integration:** Remove `cdn.tailwindcss.com` from `index.html`. Configure PostCSS Tailwind in Vite for zero-runtime CSS evaluation.
4. **Purge Backup Files:** Delete unreferenced `.backup.jsx` files from `src/components`.

### Phase 2: Architectural Decoupling & Scalability (Week 2-3)
1. **Stateless JWT Migration:** Run Google OAuth in `session: false` mode, issuing access and refresh JWTs upon Google callback. Deprecate `connect-mongo`.
2. **Differentiated Rate Limiting:** Apply dedicated limits: Auth endpoints (10 req/min), general API (120 req/min), proctoring telemetry (600 req/min).
3. **Compound Database Indexes:** Create MongoDB compound indexes on high-traffic queries:
   - `users`: `{ email: 1 }`, `{ learnerId: 1 }`, `{ googleId: 1 }`
   - `exam_sessions`: `{ examId: 1, studentId: 1, status: 1 }`
   - `camera_recordings`: `{ sessionId: 1, status: 1 }`
4. **Client Error Boundaries:** Wrap critical views (`AdaptiveExamSession`, `Roadmap`, `CameraMonitor`) in React Error Boundaries.

### Phase 3: Enterprise Observability & Operations (Week 4+)
1. **Observability:** Integrate Sentry for full-stack error tracking and Axiom/Datadog for serverless log aggregation.
2. **Automated CI/CD Pipeline:** Configure GitHub Actions for pull request linting, unit testing, and Playwright end-to-end testing.
3. **Domain Consolidation:** Map unified custom domains (e.g., `app.learningai.com` and `api.learningai.com`) to eliminate third-party cookie restrictions.

---

## 5. Target Enterprise Architecture Specification

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|               React 18 SPA (Vite, Tailwind PostCSS, Dark Theme Tokens)            |
|       [Student Test Runner]    [Live Camera Proctor]    [Admin Exam Studio]       |
+-----------------------------------------------------------------------------------+
                                       |
                                       | HTTPS / WSS
                                       v
+-----------------------------------------------------------------------------------+
|                               VERCEL EDGE ROUTING                                 |
|         Domain Routing / TLS Termination / Reverse Proxy Rewrites (/api/*)        |
+-----------------------------------------------------------------------------------+
                  |                                                 |
                  | API Calls                                       | Direct Video S3
                  v                                                 v
+----------------------------------+              +---------------------------------+
|       SERVERLESS API TIER        |              |      OBJECT STORAGE (S3/R2)     |
|   Express 4 on Node.js 22        |              |  Presigned Multi-part Uploads   |
|  - Stateless JWT Authentication  |              |  - Proctoring Video Streams     |
|  - Adaptive Difficulty Engine    |              |  - Candidate Biometric Selfies  |
|  - Rate-Limited Route Gateways   |              +---------------------------------+
+----------------------------------+
                  |
                  | Reused Connection Pool (Zero Buffering)
                  v
+-----------------------------------------------------------------------------------+
|                              DATABASE STORE (ATLAS)                               |
|            MongoDB Replica Set (M0/M10 Multi-Tenant with Compound Indexes)        |
|    Collections: [users] [learners] [exams] [sessions] [roadmaps] [questions]      |
+-----------------------------------------------------------------------------------+
```

---

## 6. Artifact Files Generated & Saved in Root

1. **[project.doc](file:///c:/Users/ELCOT/Learning.AI/project.doc)**: Comprehensive Microsoft Word document formatted with standard Word namespaces (`urn:schemas-microsoft-com:office:word`), styled typography, executive headers, status badges, and data tables.
2. **[project.pdf](file:///c:/Users/ELCOT/Learning.AI/project.pdf)**: Professional multi-page vector PDF with executive styling, header branding, and phased roadmap boxes.
3. **[PROJECT_ARCHITECTURAL_REVIEW.md](file:///c:/Users/ELCOT/Learning.AI/PROJECT_ARCHITECTURAL_REVIEW.md)**: Markdown documentation for direct viewing in IDE or Git repositories.
