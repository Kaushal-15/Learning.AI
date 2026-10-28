import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/DevvoraStyles.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail =
    location.state?.email ||
    new URLSearchParams(location.search).get("email") ||
    "";

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index, value) => {
    // Handle paste of complete 6-digit code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 6).split("");
      if (pasted.length > 0) {
        const newDigits = [...digits];
        pasted.forEach((ch, i) => {
          if (index + i < 6) newDigits[index + i] = ch;
        });
        setDigits(newDigits);
        const nextIndex = Math.min(index + pasted.length, 5);
        if (inputRefs.current[nextIndex]) {
          inputRefs.current[nextIndex].focus();
        }
      }
      return;
    }

    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    setMessage(null);

    // Auto-advance to next input if digit entered
    if (cleaned && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const otpCode = digits.join("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: "error", text: "Please provide your email address." });
      return;
    }

    if (otpCode.length !== 6) {
      setMessage({ type: "error", text: "Please enter the complete 6-digit code." });
      return;
    }

    setLoading(true);
    try {
      await api.verifyOtp(email.trim(), otpCode);
      setMessage({
        type: "success",
        text: "Email verified successfully! Redirecting to sign in...",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Invalid or expired verification code.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter your email address first." });
      return;
    }

    setResending(true);
    setMessage(null);

    try {
      const res = await api.resendOtp(email.trim());
      setMessage({
        type: "success",
        text: res.message || "A new 6-digit code has been sent to your email.",
      });
      setCountdown(60);
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        setCountdown(err.retryAfter);
        setMessage({
          type: "error",
          text: `Please wait ${err.retryAfter}s before requesting a new code.`,
        });
      } else {
        setMessage({
          type: "error",
          text: err.message || "Failed to resend code. Please try again.",
        });
      }
    } finally {
      setResending(false);
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

      {/* Right Side - Verification Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <h2 className="auth-title">Verify Your Email</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-gray-800">{email || "your email"}</span>.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="verify-email" className="auth-label">
                Email Address *
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label">6-Digit Verification Code *</label>
              <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="auth-input"
                    style={{
                      width: "48px",
                      height: "56px",
                      textAlign: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      padding: "0",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="auth-submit-btn"
              style={{
                opacity: loading || otpCode.length !== 6 ? 0.7 : 1,
                cursor: loading || otpCode.length !== 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify Code →"}
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
            <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>
              Didn't receive a code?
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="auth-link-button-primary"
              style={{
                fontSize: "0.875rem",
                cursor: countdown > 0 || resending ? "not-allowed" : "pointer",
                opacity: countdown > 0 || resending ? 0.6 : 1,
              }}
            >
              {resending
                ? "Sending..."
                : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend Code"}
            </button>
          </div>

          <p className="auth-switch-link" style={{ marginTop: "1.5rem" }}>
            <Link to="/login" className="auth-link-button">
              ← Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
