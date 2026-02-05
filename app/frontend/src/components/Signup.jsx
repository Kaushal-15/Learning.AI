import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../styles/DevvoraStyles.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

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

  // ✅ FIXED: correct hook
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((s) => ({ ...s, [id]: value }));
    setErrors((p) => ({ ...p, [id]: null }));
    setMessage(null);

    if (id === "name" && value.trim().length >= 2) {
      checkNameAvailability(value.trim());
    }
  };

  const checkNameAvailability = async (name) => {
    setCheckingName(true);
    try {
      const res = await fetch(
        `${API_BASE}/auth/check-username?username=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      setNameStatus(data);
    } catch {
      setNameStatus({ available: false, message: "Unable to check username" });
    } finally {
      setCheckingName(false);
    }
  };

  const clientValidate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Username is required";
    if (!form.email.trim() || !validateEmail(form.email))
      err.email = "Invalid email address";
    if (!form.password || form.password.length < 8)
      err.password = "Password must be at least 8 characters";
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
      // ✅ FIXED endpoint
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Signup failed" });
        return;
      }

      setMessage({
        type: "success",
        text: "Account created successfully! Redirecting to login..."
      });

      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setMessage({ type: "error", text: "Server unreachable. Try later." });
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(form.password);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="auth-right-panel">
      <div className="auth-form-container">
        <h2 className="auth-title">Create Account</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            id="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Username"
            className="auth-input"
          />
          {errors.name && <p className="auth-error-text">{errors.name}</p>}

          <input
            id="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="auth-input"
          />
          {errors.email && <p className="auth-error-text">{errors.email}</p>}

          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="auth-input"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Creating Account..." : "Sign Up →"}
          </button>
        </form>

        {message && (
          <div
            className={
              message.type === "error"
                ? "auth-message-error"
                : "auth-message-success"
            }
          >
            {message.text}
          </div>
        )}

        {/* ✅ FIXED Google OAuth path */}
        <button
          className="auth-google-btn"
          onClick={() => (window.location.href = `${API_BASE}/auth/google`)}
          type="button"
        >
          Continue with Google
        </button>

        <p className="auth-switch-link">
          <button onClick={() => navigate("/login")}>
            Already have an account? Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
