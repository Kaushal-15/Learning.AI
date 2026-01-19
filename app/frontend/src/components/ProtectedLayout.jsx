import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * ProtectedLayout:
 * Wrapper that checks if the user is authenticated before allowing route access.
 * - Uses cookie-based JWT session (HttpOnly cookie)
 * - Calls /api/profile/me to verify session validity
 * - Redirects to /login if unauthorized
 */
export default function ProtectedLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile/me`, {
          method: "GET",
          credentials: "include", // 🔐 Required for cookie-based JWT auth
        });

        // ✅ If authenticated
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUser(data.user);
          // Store user in localStorage for easy access in other components
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // ❌ If unauthorized, redirect to login after a short delay
          console.warn("User not authenticated:", res.status);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setLoadingMessage("Server unreachable. Retrying...");
        // Optional: You could retry here if needed
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // ⏳ While checking authentication
  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-600">
        <div className="animate-pulse text-lg">{loadingMessage}</div>
      </div>
    );
  }

  // 🔑 Authenticated → render protected routes
  if (isAuthenticated) {
    return <Outlet />;
  }

  // 🚪 Not authenticated → redirect to login
  return <Navigate to="/login" replace />;
}
