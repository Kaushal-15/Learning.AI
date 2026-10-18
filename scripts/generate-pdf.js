const fs = require('fs');
const path = require('path');

// Simple, robust pure-JS PDF generator
class SimplePDF {
  constructor() {
    this.pages = [];
    this.currentPage = null;
  }

  addPage() {
    this.currentPage = {
      lines: [],
      height: 841.89, // A4
      width: 595.28
    };
    this.pages.push(this.currentPage);
    return this.currentPage;
  }

  addText(text, x, y, size = 11, font = 'F1', r = 0, g = 0, b = 0) {
    // Sanitize text for PDF string literal
    const safeText = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.currentPage.lines.push({
      type: 'text',
      content: `BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${y} Td (${safeText}) Tj ET`
    });
  }

  addRect(x, y, w, h, r = 0.9, g = 0.9, b = 0.9, fill = true) {
    this.currentPage.lines.push({
      type: 'rect',
      content: `${r} ${g} ${b} ${fill ? 'rg' : 'RG'} ${x} ${y} ${w} ${h} ${fill ? 're f' : 're s'}`
    });
  }

  addLine(x1, y1, x2, y2, r = 0.8, g = 0.8, b = 0.8, lineWidth = 1) {
    this.currentPage.lines.push({
      type: 'line',
      content: `${lineWidth} w ${r} ${g} ${b} RG ${x1} ${y1} m ${x2} ${y2} l S`
    });
  }

  build() {
    const objects = [];
    const addObject = (content) => {
      objects.push(content);
      return objects.length;
    };

    // 1. Catalog
    // 2. Pages
    // 3. Font Helvetica
    // 4. Font Helvetica-Bold
    // 5... Page and Content objects

    const font1Id = 3;
    const font2Id = 4;

    const pageObjIds = [];
    const contentObjIds = [];

    // Pre-allocate slots
    let nextId = 5;
    for (let i = 0; i < this.pages.length; i++) {
      pageObjIds.push(nextId++);
      contentObjIds.push(nextId++);
    }

    const pagesObjId = 2;
    const catalogObjId = 1;

    // Build object contents
    const objList = [];

    // Catalog
    objList[1] = `<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`;

    // Pages
    const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
    objList[2] = `<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${this.pages.length} >>`;

    // Fonts
    objList[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objList[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

    // Individual Pages & Content Streams
    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i];
      const pId = pageObjIds[i];
      const cId = contentObjIds[i];

      objList[pId] = `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [ 0 0 ${p.width} ${p.height} ] /Contents ${cId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> >>`;

      const streamContent = p.lines.map(l => l.content).join('\n');
      const streamLen = Buffer.byteLength(streamContent, 'utf-8');
      objList[cId] = `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`;
    }

    // Assemble file
    let pdf = '%PDF-1.4\n%âãÏÓ\n';
    const xrefOffsets = [];

    for (let i = 1; i < objList.length; i++) {
      xrefOffsets[i] = Buffer.byteLength(pdf, 'utf-8');
      pdf += `${i} 0 obj\n${objList[i]}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref\n0 ${objList.length}\n0000000000 65535 f \n`;

    for (let i = 1; i < objList.length; i++) {
      const offset = String(xrefOffsets[i]).padStart(10, '0');
      pdf += `${offset} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objList.length} /Root ${catalogObjId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'binary');
  }
}

// Generate the Learning.AI PDF
const doc = new SimplePDF();

// ================= PAGE 1: TITLE & EXECUTIVE SUMMARY =================
doc.addPage();
// Header banner rectangle (deep indigo)
doc.addRect(40, 710, 515, 95, 0.12, 0.11, 0.29);
doc.addText('Learning.AI', 60, 770, 24, 'F2', 1, 1, 1);
doc.addText('System Architecture, Feature Directory & Senior Technical Roadmap', 60, 745, 12, 'F1', 0.8, 0.85, 1);
doc.addText('Version 1.0  |  Senior Cloud Solutions Architect Review  |  Production Readiness Blueprint', 60, 725, 9, 'F1', 0.7, 0.75, 0.95);

// Executive Summary Section
doc.addText('1. Executive Summary & Production Topology', 40, 680, 15, 'F2', 0.12, 0.11, 0.29);
doc.addLine(40, 672, 555, 672, 0.8, 0.85, 0.9, 1.5);

doc.addText('Learning.AI is an AI-powered education and adaptive assessment platform designed for dynamic skill', 40, 650, 10, 'F1', 0.2, 0.2, 0.25);
doc.addText('evaluation, real-time proctoring, and personalized learning paths. The system combines an adaptive test engine,', 40, 635, 10, 'F1', 0.2, 0.2, 0.25);
doc.addText('biometric verification, WebRTC webcam proctoring, and comprehensive progress tracking.', 40, 620, 10, 'F1', 0.2, 0.2, 0.25);

// Status Box
doc.addRect(40, 530, 515, 75, 0.94, 0.98, 0.95);
doc.addLine(40, 530, 40, 605, 0.08, 0.64, 0.29, 3);
doc.addText('Key Milestone Achieved (October 2026):', 55, 585, 10, 'F2', 0.08, 0.45, 0.2);
doc.addText('- Mongoose serverless cold-start buffering timeout (10000ms) permanently resolved.', 55, 570, 9.5, 'F1', 0.1, 0.35, 0.15);
doc.addText('- Middleware reordered: connectDB guarantees MongoDB readyState === 1 before session/passport.', 55, 555, 9.5, 'F1', 0.1, 0.35, 0.15);
doc.addText('- Live production verified: /api/health/db (200 OK) and /api/auth/login responding cleanly.', 55, 540, 9.5, 'F1', 0.1, 0.35, 0.15);

// Deployment Table
doc.addText('Active Deployment Topology:', 40, 505, 12, 'F2', 0.12, 0.11, 0.29);

doc.addRect(40, 400, 515, 90, 0.97, 0.98, 1.0);
doc.addLine(40, 465, 555, 465, 0.8, 0.85, 0.9, 1);
doc.addLine(40, 440, 555, 440, 0.8, 0.85, 0.9, 1);
doc.addLine(40, 415, 555, 415, 0.8, 0.85, 0.9, 1);

doc.addText('Tier / Layer', 50, 475, 10, 'F2', 0.12, 0.11, 0.29);
doc.addText('Technology Stack', 160, 475, 10, 'F2', 0.12, 0.11, 0.29);
doc.addText('Live Production URL / Identifier', 350, 475, 10, 'F2', 0.12, 0.11, 0.29);

doc.addText('Frontend Client', 50, 450, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('React 18, Vite, Tailwind CSS', 160, 450, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('https://learning-ai-rswf.vercel.app', 350, 450, 9.5, 'F1', 0.1, 0.2, 0.8);

doc.addText('Backend API', 50, 425, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('Node.js 22, Express 4, Mongoose 7', 160, 425, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('https://learning-ai-mocha.vercel.app', 350, 425, 9.5, 'F1', 0.1, 0.2, 0.8);

doc.addText('Database Cluster', 50, 403, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('MongoDB Atlas (Replica Set)', 160, 403, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('learning-ai (Cluster: ac-thajia8)', 350, 403, 9.5, 'F1', 0.2, 0.2, 0.25);

// Architectural Highlights
doc.addText('2. Platform Capabilities & Functional Subsystems', 40, 370, 15, 'F2', 0.12, 0.11, 0.29);
doc.addLine(40, 362, 555, 362, 0.8, 0.85, 0.9, 1.5);

doc.addText('Adaptive Exam Engine:', 40, 340, 11, 'F2', 0.22, 0.19, 0.54);
doc.addText('Dynamically adjusts test difficulty based on real-time student performance vectors. Implemented in', 40, 325, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('AdaptiveDifficultyEngine.js and AdaptiveExamSession.jsx with real-time score calibration.', 40, 310, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('Biometric Verification & Camera Proctoring:', 40, 285, 11, 'F2', 0.22, 0.19, 0.54);
doc.addText('Enforces candidate integrity via facial snapshots and continuous webcam recording. Includes', 40, 270, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('AdminBiometricApproval.jsx and real-time candidate feed monitoring in CameraMonitor.jsx.', 40, 255, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('Curriculum Roadmaps & Gamification:', 40, 230, 11, 'F2', 0.22, 0.19, 0.54);
doc.addText('Structured learning tracks (Frontend, Backend, AI/ML, Mobile, DevOps) mapped to granular lesson modules.', 40, 215, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('Integrated with XP points, streak counters, and category mastery levels (xp.service.js).', 40, 200, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('Personalized Content Generation:', 40, 175, 11, 'F2', 0.22, 0.19, 0.54);
doc.addText('Generates custom question sets (PersonalizedQuestionSetService.js) targeting individual weak spots', 40, 160, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('identified from prior assessment results and quiz history.', 40, 145, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('Page 1 of 3  -  Learning.AI Architectural Assessment', 220, 50, 9, 'F1', 0.5, 0.5, 0.5);

// ================= PAGE 2: ARCHITECTURAL GAP ANALYSIS =================
doc.addPage();
doc.addText('3. Senior Architectural Evaluation & Gap Analysis', 40, 780, 15, 'F2', 0.12, 0.11, 0.29);
doc.addLine(40, 772, 555, 772, 0.8, 0.85, 0.9, 1.5);

doc.addText('A rigorous review of the codebase identifies five specific areas required to achieve full production excellence:', 40, 750, 10, 'F1', 0.2, 0.2, 0.25);

// Findings Table
doc.addRect(40, 480, 515, 250, 0.98, 0.98, 0.99);
doc.addLine(40, 705, 555, 705, 0.8, 0.85, 0.9, 1);
doc.addLine(40, 645, 555, 645, 0.8, 0.85, 0.9, 1);
doc.addLine(40, 590, 555, 590, 0.8, 0.85, 0.9, 1);
doc.addLine(40, 535, 555, 535, 0.8, 0.85, 0.9, 1);

doc.addText('Architecture Finding', 50, 715, 10, 'F2', 0.12, 0.11, 0.29);
doc.addText('Severity', 210, 715, 10, 'F2', 0.12, 0.11, 0.29);
doc.addText('Current State & Senior Architect Remedy', 280, 715, 10, 'F2', 0.12, 0.11, 0.29);

doc.addText('1. Video Storage on Ephemeral Disk', 50, 685, 9, 'F2', 0.7, 0.1, 0.1);
doc.addText('CRITICAL', 210, 685, 8.5, 'F2', 0.8, 0.1, 0.1);
doc.addText('recordingService.js writes to local /uploads on disk. On Vercel,', 280, 690, 8.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('serverless disks are read-only and ephemeral. Migrate to S3/R2 direct uploads.', 280, 675, 8.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('2. Missing Database Seed Data', 50, 625, 9, 'F2', 0.8, 0.4, 0.0);
doc.addText('HIGH', 210, 625, 8.5, 'F2', 0.8, 0.4, 0.0);
doc.addText('Collections like "roadmaps" are empty in Atlas, causing /api/roadmaps/frontend', 280, 630, 8.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('to 404. Deploy an automated seed script for all core roadmap tracks.', 280, 615, 8.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('3. Tailwind CDN in Production', 50, 570, 9, 'F2', 0.8, 0.4, 0.0);
doc.addText('HIGH', 210, 570, 8.5, 'F2', 0.8, 0.4, 0.0);
doc.addText('index.html loads cdn.tailwindcss.com. Browser warns not for production.', 280, 575, 8.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('Configure Tailwind via PostCSS inside Vite for optimal performance.', 280, 560, 8.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('4. Pure Stateless JWT Auth', 50, 515, 9, 'F2', 0.2, 0.3, 0.7);
doc.addText('MEDIUM', 210, 515, 8.5, 'F2', 0.2, 0.3, 0.7);
doc.addText('Passport and session store add cold-start overhead. Transition Google OAuth', 280, 520, 8.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('and protected routes to pure JWTs (eliminate MongoStore dependency).', 280, 505, 8.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('5. Rate Limiter Tuning', 50, 460, 9, 'F2', 0.2, 0.3, 0.7);
doc.addText('MEDIUM', 210, 460, 8.5, 'F2', 0.2, 0.3, 0.7);
doc.addText('Global 100 req / 15 min rate limiter risks dropping high-frequency proctoring', 280, 465, 8.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('telemetry chunks. Segment limits by endpoint purpose.', 280, 450, 8.5, 'F1', 0.2, 0.2, 0.25);

// Deep Dive Explanations
doc.addText('Detailed Technical Analysis:', 40, 410, 12, 'F2', 0.12, 0.11, 0.29);

doc.addText('1. Video Storage & Proctoring Architecture', 40, 385, 10.5, 'F2', 0.22, 0.19, 0.54);
doc.addText('In cameraRoutes.js and recordingService.js, video chunks sent from candidate webcams are currently', 40, 370, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('appended to local files using fs.appendFile. On Vercel, each request may execute on a separate lambda instance', 40, 355, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('with a clean ephemeral file container. The required architectural pattern is presigned cloud object URLs', 40, 340, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('(Amazon S3 or Cloudflare R2), allowing candidate browsers to stream WebM video chunks straight to cloud buckets.', 40, 325, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('2. Seeding & Database Integrity', 40, 295, 10.5, 'F2', 0.22, 0.19, 0.54);
doc.addText('When the frontend requests /api/roadmaps/frontend, the route queries Roadmap.findOne({ roadmapId: ... }).', 40, 280, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('Because the database does not contain seed documents, the endpoint returns 404. Incorporating an automated', 40, 265, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('idempotent seeder ensures default tracks (frontend, backend, full-stack, ai-ml) are populated upon boot.', 40, 250, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('3. Frontend Bundle & PostCSS Optimization', 40, 220, 10.5, 'F2', 0.22, 0.19, 0.54);
doc.addText('Tailwind CSS loaded through cdn.tailwindcss.com evaluates all style rules on client-side JS runtime.', 40, 205, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('Transitioning to Vite PostCSS build plugin bundles purged CSS, eliminating runtime evaluation and latency.', 40, 190, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addText('Page 2 of 3  -  Learning.AI Architectural Assessment', 220, 50, 9, 'F1', 0.5, 0.5, 0.5);

// ================= PAGE 3: ROADMAP & IMPLEMENTATION BLUEPRINT =================
doc.addPage();
doc.addText('4. Phased Production Blueprint & Technical Roadmap', 40, 780, 15, 'F2', 0.12, 0.11, 0.29);
doc.addLine(40, 772, 555, 772, 0.8, 0.85, 0.9, 1.5);

// Phase 1 Box
doc.addRect(40, 640, 515, 115, 0.96, 0.98, 1.0);
doc.addText('Phase 1: Immediate Production Hardening (Priority 1)', 55, 735, 11, 'F2', 0.12, 0.11, 0.45);
doc.addText('- Implement S3/R2 presigned URL generation for proctoring video chunk streaming.', 55, 715, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Run database seed script for roadmaps and question banks in MongoDB Atlas.', 55, 698, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Migrate Tailwind CSS from CDN to PostCSS/Vite inside app/frontend.', 55, 681, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Remove dead/duplicate backup files in frontend src/components to reduce bundle footprint.', 55, 664, 9.5, 'F1', 0.2, 0.2, 0.25);

// Phase 2 Box
doc.addRect(40, 495, 515, 125, 0.96, 0.98, 1.0);
doc.addText('Phase 2: Architectural Decoupling & Scalability (Priority 2)', 55, 595, 11, 'F2', 0.12, 0.11, 0.45);
doc.addText('- Refactor Google OAuth to stateless JWT exchange (session: false), deprecating MongoStore.', 55, 575, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Segment express-rate-limit: auth (10/min), general API (120/min), proctoring telemetry (600/min).', 55, 558, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Create compound indexes in Atlas for examId, sessionId, learnerId, and status.', 55, 541, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Add React Error Boundaries around AdaptiveExamSession and Roadmap modules.', 55, 524, 9.5, 'F1', 0.2, 0.2, 0.25);

// Phase 3 Box
doc.addRect(40, 360, 515, 115, 0.96, 0.98, 1.0);
doc.addText('Phase 3: Enterprise Observability & Operations (Priority 3)', 55, 450, 11, 'F2', 0.12, 0.11, 0.45);
doc.addText('- Setup Sentry error monitoring across frontend SPA and Vercel serverless functions.', 55, 430, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Implement automated end-to-end testing with Playwright for login, exam, and proctoring flows.', 55, 413, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('- Consolidate custom domains under unified root (e.g., app.learningai.com & api.learningai.com).', 55, 396, 9.5, 'F1', 0.2, 0.2, 0.25);

// Architect Sign-off
doc.addText('5. Architectural Sign-off & Recommendation', 40, 330, 14, 'F2', 0.12, 0.11, 0.29);
doc.addLine(40, 322, 555, 322, 0.8, 0.85, 0.9, 1.5);

doc.addText('With the resolution of the Mongoose connection lifecycle and query buffering bottleneck, the core', 40, 300, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('infrastructure now operates reliably on Vercel Serverless. By systematically addressing the cloud storage', 40, 285, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('and database seeding milestones outlined above, Learning.AI will represent a benchmark educational', 40, 270, 9.5, 'F1', 0.2, 0.2, 0.25);
doc.addText('platform capable of supporting thousands of concurrent examination sessions with complete integrity.', 40, 255, 9.5, 'F1', 0.2, 0.2, 0.25);

doc.addRect(40, 180, 515, 55, 0.98, 0.98, 0.98);
doc.addText('Approved by: Senior Full-Stack Cloud Solutions Architect', 55, 215, 9.5, 'F2', 0.12, 0.11, 0.29);
doc.addText('Date: October 18, 2026  |  Document Status: ACTIVE & APPROVED  |  Learning.AI v1.0', 55, 195, 9, 'F1', 0.4, 0.4, 0.45);

doc.addText('Page 3 of 3  -  Learning.AI Architectural Assessment', 220, 50, 9, 'F1', 0.5, 0.5, 0.5);

// Output PDF to disk
const pdfBytes = doc.build();
const pdfPath = path.join(__dirname, '../project.pdf');
fs.writeFileSync(pdfPath, pdfBytes);
console.log('✅ Generated project.pdf successfully at:', pdfPath, 'Size:', pdfBytes.length, 'bytes');
