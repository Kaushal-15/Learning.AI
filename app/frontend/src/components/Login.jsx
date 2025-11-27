import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text: string }

  // Enforce Light Mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    // Optional: Re-add dark mode if user navigates away (handled by other components usually)
    return () => {
      // We don't necessarily need to re-add it here, as other components like Dashboard 
      // will check local storage and add it back if needed.
    };
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
        credentials: "include", // ✅ important: allows cookies to be sent & stored
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Logged in successfully! Redirecting..." });

        // ✅ short delay so the user can see message
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

  return (
    <section className="w-full min-h-screen flex justify-center items-center bg-gradient-to-br from-[#FFECC0] via-[#f9f4e3] to-[#344F1F] text-color1 px-6 sm:px-10 md:px-16 lg:px-24">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Welcome back
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Log in to your <span className="font-semibold text-color1">Learning.AI</span> account
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-md font-semibold mb-2 text-color1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-color4 transition"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-md font-semibold mb-2 text-color1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-color4 transition"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="accent-color2" />
              <label htmlFor="remember" className="text-sm text-color1">
                Remember me
              </label>
            </div>
            <a
              href="/forgot-password"
              className="text-sm text-color1 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-color2 text-color1 py-3 rounded-lg text-lg font-semibold shadow-md hover:bg-[#ffb74d] hover:shadow-lg transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
        </form>

        {/* Status Message */}
        {message && (
          <p
            className={`text-center text-sm mt-4 ${message.type === "error" ? "text-red-600" : "text-green-700"
              }`}
          >
            {message.text}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="px-3 text-color1 text-sm">or continue with</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="text-gray-700 font-medium">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            <img
              src="https://www.svgrepo.com/show/349375/github.svg"
              alt="GitHub"
              className="w-5 h-5"
            />
            <span className="text-gray-700 font-medium">GitHub</span>
          </button>
        </div>

        {/* Signup Link */}
        <p className="text-center text-color1 text-sm mt-8">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-color1 font-semibold hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </section>
  );
}
