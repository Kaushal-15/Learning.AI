# Learning.AI Workflow Diagrams

This directory contains visual workflow diagrams for all major features of the Learning.AI platform.

## 📊 Available Diagrams

### 1. Authentication Workflow
**File:** `1_authentication_workflow.png`

Shows the complete authentication flow including:
- User registration with email/password
- OTP generation and email verification
- Login process with JWT tokens
- Token refresh mechanism
- Logout functionality

**Components:** User, Frontend, Backend API, MongoDB, Email Service

---

### 2. Quiz Generation Workflow
**File:** `2_quiz_generation_workflow.png`

Illustrates the adaptive quiz system:
- User parameter selection (roadmap, difficulty, question count)
- Performance history analysis
- Intelligent question selection with spaced repetition
- Adaptive difficulty adjustment
- Quiz submission and scoring
- Performance metrics update

**Key Features:** Adaptive learning, weak area prioritization, fallback to JSON files

---

### 3. Exam Management Workflow
**File:** `3_exam_management_workflow.png`

Demonstrates the dual-flow exam system:

**Admin Flow:**
- Exam creation and configuration
- Question bank upload (PDF/DOCX/TXT)
- Access code generation
- Candidate monitoring
- Results and analytics viewing

**Student Flow:**
- Access code entry and validation
- Exam session with proctoring
- Answer submission
- Results display

---

### 4. Custom Learning Workflow
**File:** `4_custom_learning_workflow.png`

Details the document-based learning feature:
- Document upload (PDF/DOCX/TXT, max 5MB)
- Text extraction from various formats
- AI-powered quiz generation using Gemini API
- Custom quiz taking and scoring
- Document management (view, delete)

**Technologies:** Multer, pdf-parse, mammoth, Gemini AI

---

### 5. Progress Tracking Workflow
**File:** `5_progress_tracking_workflow.png`

Shows the learning progress system:
- Roadmap progress viewing
- Lesson completion tracking
- Quiz score recording
- Progress percentage calculation
- Level advancement (Beginner → Intermediate → Advanced)
- Multi-roadmap support

**Levels:** 
- Beginner (0-33%)
- Intermediate (34-66%)
- Advanced (67-100%)

---

## 🎯 Usage

These diagrams are useful for:
- **Documentation:** Include in project reports, presentations, or README files
- **Onboarding:** Help new developers understand system architecture
- **Planning:** Reference when adding new features or debugging
- **Academic Reports:** Perfect for system design sections in project documentation

## 📝 Notes

- All diagrams are generated based on actual codebase analysis
- Diagrams follow professional technical documentation standards
- Color coding: Blue (processes), Yellow/Orange (decisions), Green (success), Red (errors)
- Each workflow corresponds to actual routes and controllers in the backend

---

**Generated on:** January 2, 2026  
**Platform:** Learning.AI  
**Version:** 1.0
