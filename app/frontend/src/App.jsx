import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
