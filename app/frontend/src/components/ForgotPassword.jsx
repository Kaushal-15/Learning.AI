import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/DevvoraStyles.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(trimmed);
      setSent(true);
      setMessage({
        type: "success",
        text: res.message || "A 6-digit reset code has been sent. Please check your inbox and Spam/Junk folder.",
      });
    } catch (err) {
      if (err.status === 404) {
        setMessage({
          type: "error",
          text: err.message || "Invalid email address. No account found with this email.",
        });
      } else if (err.status === 429) {
        const retrySecs = err.retryAfter || 45;
        setMessage({
          type: "error",
          text: err.message || `Please wait ${retrySecs}s before requesting another reset code.`,
        });
      } else {
        setMessage({
          type: "error",
          text: err.message || "Failed to process request. Please try again later.",
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

      {/* Right Side - Forgot Password Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">
            Enter your account email and we'll send you a 6-digit verification code to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="forgot-email" className="auth-label">
                Email Address *
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage(null);
                }}
                className="auth-input"
                placeholder="Enter your registered email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? "Sending Code..." : "Send Reset Code →"}
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

          {sent && (
            <div style={{ marginTop: "1.5rem" }}>
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FCD34D",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  color: "#92400E",
                }}
              >
                📬 <strong>Tip:</strong> Please check your <strong>Spam/Junk</strong> folder if you do not see the email in your inbox.
              </div>
              <button
                type="button"
                onClick={() => navigate("/reset-password", { state: { email: email.trim() } })}
                className="auth-submit-btn"
                style={{
                  background: "#10B981",
                  borderColor: "#10B981",
                }}
              >
                Enter Reset Code Now →
              </button>
            </div>
          )}

          <div className="auth-divider" style={{ margin: "2rem 0 1.5rem" }}>
            <span>Or</span>
          </div>

          <p className="auth-switch-link">
            <Link to="/login" className="auth-link-button">
              ← Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
