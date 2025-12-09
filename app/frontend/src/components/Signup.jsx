import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [nameStatus, setNameStatus] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Initial page load effect
  useState(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((s) => ({ ...s, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: null }));
    setMessage(null);

    if (id === 'name') {
      setNameStatus(null);
      if (value.trim().length >= 2) {
        checkNameAvailability(value.trim());
      }
    }
  };

  const checkNameAvailability = async (name) => {
    if (name.length < 2) return;

    setCheckingName(true);
    try {
      const res = await fetch(`${API_BASE}/auth/check-name/${encodeURIComponent(name)}`, {
        method: "GET",
      });
      const data = await res.json();
      setNameStatus(data);
    } catch (err) {
      console.error("Name check error:", err);
      setNameStatus({ available: false, message: "Error checking name availability" });
    } finally {
      setCheckingName(false);
    }
  };

  const clientValidate = () => {
    const err = {};
    if (!form.name.trim()) {
      err.name = "Username is required";
    } else if (form.name.trim().length < 2) {
      err.name = "Username must be at least 2 characters long";
    } else if (form.name.trim().length > 50) {
      err.name = "Username cannot exceed 50 characters";
    } else if (!/^[a-zA-Z0-9_\s-]+$/.test(form.name.trim())) {
      err.name = "Username can only contain letters, numbers, spaces, hyphens, and underscores";
    }

    if (!form.email.trim()) {
      err.email = "Email is required";
    } else if (!validateEmail(form.email)) {
      err.email = "Invalid email address";
    }

    if (!form.password) {
      err.password = "Password is required";
    } else if (form.password.length < 8) {
      err.password = "Password must be at least 8 characters";
    }

    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const v = clientValidate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Account created successfully! Your Learner ID: ${data.learnerId}. Redirecting to login...`
        });
        setForm({ name: "", email: "", password: "" });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        if (data.message.includes('Username already taken')) {
          setErrors({ name: data.message });
        } else if (data.message.includes('Email already registered')) {
          setErrors({ email: data.message });
        } else {
          setMessage({ type: "error", text: data.message || "Registration failed" });
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Server unreachable. Try later." });
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(form.password);

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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Learning.AI</h3>
          <p className="text-gray-600 text-sm">Setting up your learning journey...</p>
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
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join Learning.AI and start your journey today.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="name" className="auth-label">Username *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  className={`auth-input ${errors.name || nameStatus?.available === false ? 'auth-input-error' : nameStatus?.available === true ? 'auth-input-success' : ''}`}
                  placeholder="Choose a username"
                  required
                />
                {checkingName && (
                  <div className="auth-input-spinner">
                    <div className="spinner-small"></div>
                  </div>
                )}
              </div>
              {errors.name && <p className="auth-error-text">{errors.name}</p>}
              {!errors.name && nameStatus && (
                <p className={nameStatus.available ? "auth-success-text" : "auth-error-text"}>
                  {nameStatus.message}
                </p>
              )}
            </div>

            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">Email Address *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
                placeholder="Enter your email"
                required
              />
              {errors.email && <p className="auth-error-text">{errors.email}</p>}
            </div>

            <div className="auth-input-group">
              <label htmlFor="password" className="auth-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                  placeholder="Create a password"
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
              {errors.password && <p className="auth-error-text">{errors.password}</p>}

              {/* Password strength meter */}
              <div className="password-strength-container">
                <div className="password-strength-bar">
                  <div
                    className={`password-strength-fill strength-${strength}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <p className="password-strength-text">
                  {form.password ? ["Very weak", "Weak", "Okay", "Good", "Strong"][strength] : "Choose a secure password"}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? "Creating Account..." : "Sign Up →"}
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

          <button className="auth-google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="auth-switch-text">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="auth-switch-link">
            <button onClick={() => navigate("/login")} className="auth-link-button-primary">
              Already have an account? Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
