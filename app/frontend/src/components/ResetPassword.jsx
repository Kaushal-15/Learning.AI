import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import "../styles/DevvoraStyles.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail =
    location.state?.email ||
    new URLSearchParams(location.search).get("email") ||
    "";

  const [form, setForm] = useState({
    email: initialEmail,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const email = form.email.trim();
    const otp = form.otp.trim();
    const { newPassword, confirmPassword } = form;

    if (!email || !otp || !newPassword) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }

    if (otp.length !== 6) {
      setMessage({ type: "error", text: "Please enter the full 6-digit verification code." });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      setMessage({ type: "error", text: "Password must be between 8 and 128 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(email, otp, newPassword);
      setMessage({
        type: "success",
        text: res.message || "Password reset successfully! Redirecting to sign in...",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      if (err.status === 404) {
        setMessage({
          type: "error",
          text: err.message || "Invalid email address. No account found with this email.",
        });
      } else {
        setMessage({
          type: "error",
          text: err.message || "Failed to reset password. Please verify the code and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Left Side - Logo */}
      <div className="auth-left-panel">
        <div className="auth-logo-container">
          <div className="auth-logo-circle">
            <svg viewBox="0 0 120 120" className="auth-logo-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#orangeGradient)" strokeWidth="2" opacity="0.3" />
              <rect x="35" y="45" width="50" height="35" rx="3" fill="white" opacity="0.9" />
              <line x1="60" y1="45" x2="60" y2="80" stroke="#FF8A00" strokeWidth="1.5" opacity="0.5" />
              <line x1="50" y1="45" x2="50" y2="80" stroke="#FF8A00" strokeWidth="1" opacity="0.3" />
              <line x1="70" y1="45" x2="70" y2="80" stroke="#FF8A00" strokeWidth="1" opacity="0.3" />
              <path d="M 45 35 L 46 38 L 49 39 L 46 40 L 45 43 L 44 40 L 41 39 L 44 38 Z" fill="#FFB84D" />
              <path d="M 75 32 L 76.5 36 L 80.5 37.5 L 76.5 39 L 75 43 L 73.5 39 L 69.5 37.5 L 73.5 36 Z" fill="white" />
              <path d="M 88 55 L 89 58 L 92 59 L 89 60 L 88 63 L 87 60 L 84 59 L 87 58 Z" fill="#FFB84D" />
              <circle cx="60" cy="62" r="8" fill="none" stroke="#FF8A00" strokeWidth="2" />
              <circle cx="60" cy="62" r="3" fill="#FF8A00" />
              <line x1="60" y1="59" x2="60" y2="54" stroke="#FF8A00" strokeWidth="1.5" />
              <line x1="63" y1="60" x2="67" y2="58" stroke="#FF8A00" strokeWidth="1.5" />
              <line x1="57" y1="60" x2="53" y2="58" stroke="#FF8A00" strokeWidth="1.5" />
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#FF8A00", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#FFB84D", stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold mt-6" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            Learning.AI
          </h2>
          <p className="text-white/80 text-sm mt-2">Your AI-Powered Learning Platform</p>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <h2 className="auth-title">Set New Password</h2>
          <p className="auth-subtitle">
            Enter the 6-digit verification code and choose a new password.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">
                Email Address *
              </label>
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
              <label htmlFor="otp" className="auth-label">
                6-Digit Reset Code *
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.otp}
                onChange={handleChange}
                className="auth-input"
                placeholder="e.g. 123456"
                style={{ letterSpacing: "4px", fontWeight: "600" }}
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="newPassword" className="auth-label">
                New Password (8–128 characters) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter new password"
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

            <div className="auth-input-group">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirm New Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-password-toggle"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? "Resetting Password..." : "Reset Password →"}
            </button>
          </form>

          {message && (
            <div
              className={`auth-message ${
                message.type === "error" ? "auth-message-error" : "auth-message-success"
              }`}
              style={{ marginTop: "1rem" }}
            >
              {message.text}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #E5E7EB",
            }}
          >
            <Link to="/forgot-password" className="auth-link-button">
              Request new code
            </Link>
            <Link to="/login" className="auth-link-button-primary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
