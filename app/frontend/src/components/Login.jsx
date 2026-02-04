import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../styles/DevvoraStyles.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    // Simulate initial page load
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.email || !form.password) {
      setMessage({ type: "error", text: "Please provide both email and password." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Logged in successfully! Redirecting..." });
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      } else {
        setMessage({ type: "error", text: data.message || "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage({ type: "error", text: "Server unreachable. Try again later." });
    } finally {
      setLoading(false);
    }
  };

  // Premium loading state
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full opacity-20 animate-pulse"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Learning.AI</h3>
          <p className="text-gray-600 text-sm">Preparing your learning experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-container">
      {/* Left Side - Logo */}
      <div className="auth-left-panel">
        <div className="auth-logo-container">
          <div className="auth-logo-circle">
            <svg viewBox="0 0 120 120" className="auth-logo-svg">
              {/* Outer glow circle */}
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#orangeGradient)" strokeWidth="2" opacity="0.3" />

              {/* Book base */}
              <rect x="35" y="45" width="50" height="35" rx="3" fill="white" opacity="0.9" />

              {/* Book pages */}
              <line x1="60" y1="45" x2="60" y2="80" stroke="#FF8A00" strokeWidth="1.5" opacity="0.5" />
              <line x1="50" y1="45" x2="50" y2="80" stroke="#FF8A00" strokeWidth="1" opacity="0.3" />
              <line x1="70" y1="45" x2="70" y2="80" stroke="#FF8A00" strokeWidth="1" opacity="0.3" />

              {/* AI Sparkles/Stars */}
              <path d="M 45 35 L 46 38 L 49 39 L 46 40 L 45 43 L 44 40 L 41 39 L 44 38 Z" fill="#FFB84D" />
              <path d="M 75 32 L 76.5 36 L 80.5 37.5 L 76.5 39 L 75 43 L 73.5 39 L 69.5 37.5 L 73.5 36 Z" fill="white" />
              <path d="M 88 55 L 89 58 L 92 59 L 89 60 L 88 63 L 87 60 L 84 59 L 87 58 Z" fill="#FFB84D" />

              {/* Brain/Neural network symbol on book */}
              <circle cx="60" cy="62" r="8" fill="none" stroke="#FF8A00" strokeWidth="2" />
              <circle cx="60" cy="62" r="3" fill="#FF8A00" />
              <line x1="60" y1="59" x2="60" y2="54" stroke="#FF8A00" strokeWidth="1.5" />
              <line x1="63" y1="60" x2="67" y2="58" stroke="#FF8A00" strokeWidth="1.5" />
              <line x1="57" y1="60" x2="53" y2="58" stroke="#FF8A00" strokeWidth="1.5" />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FF8A00', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#FFB84D', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold mt-6" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Learning.AI</h2>
          <p className="text-white/80 text-sm mt-2">Your AI-Powered Learning Platform</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Welcome back! Please sign in to your account.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">Email Address *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="auth-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password" className="auth-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-forgot-link">
              <button type="button" onClick={() => navigate("/forgot-password")} className="auth-link-button">
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? "Signing In..." : "Sign In →"}
            </button>
          </form>

          {message && (
            <div className={`auth-message ${message.type === "error" ? "auth-message-error" : "auth-message-success"}`}>
              {message.text}
            </div>
          )}

          <div className="auth-divider">
            <span>Or continue with</span>
          </div>

          <button
            className="auth-google-btn"
            onClick={() => window.location.href = `${BASE_URL}/auth/google`}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="auth-switch-text">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="auth-switch-link">
            <button onClick={() => navigate("/signup")} className="auth-link-button-primary">
              Create a new account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
