import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import VerifyEmail from "./components/VerifyEmail";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Home from "./components/Home";
import Result from "./components/Result";
import Dashboard from "./components/Dashboard";
import ProtectedLayout from "./components/ProtectedLayout";
import Profile from "./components/Profile";
import Roadmap from "./components/Roadmap";
import Learn from "./components/Learn";
import LearnPaths from "./components/LearnPaths";
import Test from "./components/Test";
import LessonDetail from "./components/LessonDetail";
import QuizSelection from "./components/QuizSelection";
import Quiz from "./components/Quiz";
import ContentGeneratorDemo from "./components/ContentGeneratorDemo";
import AdaptiveQuizTest from "./components/AdaptiveQuizTest";
import Settings from "./components/Settings";
import CustomLearning from "./components/CustomLearning";
import CustomQuizHistory from "./components/CustomQuizHistory";
import ExamDashboard from "./components/ExamDashboard";
import ExamSession from "./components/ExamSession";
import AdaptiveExamSession from "./components/AdaptiveExamSession";
import ExamVerification from "./components/ExamVerification";
import ExamResult from "./components/ExamResult";
import AdminExamDashboard from "./components/AdminExamDashboard";
import AdminStudentManagement from "./components/AdminStudentManagement";
import ExamMonitor from "./components/ExamMonitor";
import ExamAnalytics from "./components/ExamAnalytics";
import AdminExamCreate from "./components/AdminExamCreate";
import AdminExamManage from "./components/AdminExamManage";
import AdminBiometricApproval from "./components/AdminBiometricApproval";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-code" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />

        {/* all protected pages */}

        <Route element={<ProtectedLayout />}>
          <Route path="/result" element={<Result />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/LearnPaths" element={<LearnPaths />} />
          <Route path="/learn/:roadmapId/:lessonId" element={<LessonDetail />} />
          <Route path="/test" element={<Test />} />
          <Route path="/quiz-selection" element={<QuizSelection />} />
          <Route path="/quiz/:id" element={<Quiz />} />
          <Route path="/content-demo" element={<ContentGeneratorDemo />} />
          <Route path="/adaptive-quiz-test" element={<AdaptiveQuizTest />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/custom-learning" element={<CustomLearning />} />
          <Route path="/custom-quiz-history" element={<CustomQuizHistory />} />

          {/* Exam Routes */}
          <Route path="/exam" element={<ExamDashboard />} />
          <Route path="/exam/:examId/verify" element={<ErrorBoundary><ExamVerification /></ErrorBoundary>} />
          <Route path="/exam/:examId" element={<ErrorBoundary><ExamSession /></ErrorBoundary>} />
          <Route path="/exam/:examId/adaptive" element={<ErrorBoundary><AdaptiveExamSession /></ErrorBoundary>} />
          <Route path="/exam/:examId/result" element={<ExamResult />} />

          {/* Admin Routes */}
          <Route path="/admin/exams" element={<AdminExamDashboard />} />
          <Route path="/admin/exams/create" element={<AdminExamCreate />} />
          <Route path="/admin/exams/:examId/manage" element={<AdminExamManage />} />
          <Route path="/admin/exams/:examId" element={<AdminExamManage />} />
          <Route path="/admin/exams/:examId/students" element={<AdminExamManage initialTab="students" />} />
          <Route path="/admin/exams/:examId/monitor" element={<AdminExamManage initialTab="monitoring" />} />
          <Route path="/admin/exams/:examId/analytics" element={<AdminExamManage initialTab="results" />} />
          <Route path="/admin/exams/:examId/edit" element={<AdminExamManage initialTab="settings" />} />
          <Route path="/admin/exams/:examId/biometrics" element={<AdminExamManage initialTab="biometric" />} />
          <Route path="/admin/biometrics" element={<AdminBiometricApproval />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
