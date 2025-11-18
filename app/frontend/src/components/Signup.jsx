import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function passwordStrength(password) {
  // returns 0..4 (weak -> strong)
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
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text: string }
  const [errors, setErrors] = useState({});
  const [nameStatus, setNameStatus] = useState(null); // { available: boolean, message: string }
  const [checkingName, setCheckingName] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((s) => ({ ...s, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: null }));
    setMessage(null);
    
    // Check name availability when name changes
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
        // Handle specific error messages
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

  return (
    <>
      <section className="w-full min-h-screen flex justify-center items-center bg-gradient-to-br from-[#FFECC0] via-[#f9f4e3] to-[#344F1F] text-color1 px-6 sm:px-10 md:px-16 lg:px-24 ">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
            Create your account
          </h2>
          <p className="text-center text-gray-500 mb-8">
            Join <span className="font-semibold text-color1">Learning.AI</span> and start your journey
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-md font-semibold mb-2 text-color1">Username</label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-color4 transition ${
                    errors.name ? "border-red-400" : 
                    nameStatus?.available === false ? "border-red-400" :
                    nameStatus?.available === true ? "border-green-400" : "border-gray-300"
                  }`}
                  placeholder="Choose a username"
                  required
                />
                {checkingName && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-color1"></div>
                  </div>
                )}
              </div>
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              {!errors.name && nameStatus && (
                <p className={`text-sm mt-1 ${nameStatus.available ? "text-green-600" : "text-red-600"}`}>
                  {nameStatus.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-md font-semibold mb-2 text-color1">Email Address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-color4 transition ${errors.email ? "border-red-400" : "border-gray-300"}`}
                placeholder="Enter your email"
                required
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-md font-semibold mb-2 text-color1">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-color4 transition ${errors.password ? "border-red-400" : "border-gray-300"}`}
                placeholder="Create a password"
                required
              />
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}

              {/* Simple strength meter */}
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${strength <= 1 ? "bg-red-500" : strength === 2 ? "bg-orange-400" : strength === 3 ? "bg-yellow-400" : "bg-green-500"}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  {form.password ? ["Very weak", "Weak", "Okay", "Good", "Strong"][strength] : "Choose a secure password"}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-color2 text-color1 py-3 rounded-lg text-lg font-semibold shadow-md hover:bg-[#ffb74d] hover:shadow-lg transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {message && (
            <p className={`text-center text-sm mt-4 ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
              {message.text}
            </p>
          )}

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-3 text-color1 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
              <span className="text-gray-700 font-medium">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              <img src="https://www.svgrepo.com/show/349375/github.svg" alt="GitHub" className="w-5 h-5" />
              <span className="text-gray-700 font-medium">GitHub</span>
            </button>
          </div>

          <p className="text-center text-color1 text-sm mt-8">
            Already have an account?{" "}
            <a href="/login" className="text-color1 font-semibold hover:underline">Log in</a>
          </p>
        </div>
      </section>
    </>
  );
}
