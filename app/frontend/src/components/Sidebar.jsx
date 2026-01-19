import { useNavigate, useLocation } from "react-router-dom";
import {
    Home, BookOpen, FolderKanban, Settings, LogOut,
    Moon, Sun, History, FileText, Shield, ClipboardList
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import ProgressTracker from "./ProgressTracker";
import "../styles/DevvoraStyles.css";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    const logout = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) {
                localStorage.clear();
                window.location.href = "/login";
            }
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-content">
                <div className="sidebar-logo">
                    <div className="logo-icon">📚</div>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
                        onClick={() => navigate("/dashboard")}
                        title="Dashboard"
                    >
                        <Home className="nav-icon" />
                    </button>
                    <button
                        className={`nav-item ${isActive("/learn") ? "active" : ""}`}
                        onClick={() => navigate("/learn")}
                        title="Courses"
                    >
                        <BookOpen className="nav-icon" />
                    </button>
                    <button
                        className={`nav-item ${isActive("/quiz-selection") ? "active" : ""}`}
                        onClick={() => navigate("/quiz-selection")}
                        title="Quiz History"
                    >
                        <History className="nav-icon" />
                    </button>
                    <button
                        className={`nav-item ${isActive("/exam") ? "active" : ""}`}
                        onClick={() => navigate("/exam")}
                        title="Exams"
                    >
                        <ClipboardList className="nav-icon" />
                    </button>
                    <button
                        className={`nav-item ${isActive("/custom-learning") ? "active" : ""}`}
                        onClick={() => navigate("/custom-learning")}
                        title="Custom Learning"
                    >
                        <FileText className="nav-icon" />
                    </button>
                    {isAdmin && (
                        <button
                            className={`nav-item ${isActive("/admin/exams") ? "active" : ""}`}
                            onClick={() => navigate("/admin/exams")}
                            title="Admin Dashboard"
                        >
                            <Shield className="nav-icon" />
                        </button>
                    )}
                    {/* <button
                        className={`nav-item ${isActive("/projects") ? "active" : ""}`}
                        onClick={() => navigate("/Projects")}
                        title="Projects"
                    >
                        <FolderKanban className="nav-icon" />
                    </button> */}

                    {/* Progress Tracker */}
                    <ProgressTracker />

                    <button
                        className={`nav-item ${isActive("/settings") ? "active" : ""}`}
                        onClick={() => navigate("/settings")}
                        title="Settings"
                    >
                        <Settings className="nav-icon" />
                    </button>

                    {/* Dark Mode Toggle */}
                    <button
                        className="nav-item theme-toggle-btn"
                        onClick={toggleTheme}
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                    >
                        {isDarkMode ? <Sun className="nav-icon" /> : <Moon className="nav-icon" />}
                    </button>
                </nav>

                <button className="nav-item logout-btn" onClick={logout} title="Logout">
                    <LogOut className="nav-icon" />
                </button>
            </div>
        </aside>
    );
}
