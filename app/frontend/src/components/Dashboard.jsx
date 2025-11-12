import { useState, useEffect } from "react";
import { Menu, LogOut, User } from "lucide-react";
import "../index.css";

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ Fetch logged-in user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/profile/me", {
          method: "GET",
          credentials: "include", // sends JWT cookies
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setUser(data.user);
        } else {
          console.warn("Not logged in:", data.message);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // ✅ Logout function
  const logout = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        localStorage.clear();
        setUser(null);
        window.location.href = "/login"; // redirect to login
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <section className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-[#FFECC0] via-[#f9f4e3] to-[#344F1F] text-gray-900">
      {/* ================= NAVBAR ================= */}
      <nav className="w-[90%] md:w-3/4 mt-6 flex items-center justify-between px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-[#344F1F] to-[#4E6D2D] text-white relative">
        <div className="flex items-center gap-3">
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden flex items-center justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold">✨ Learning.AI</h1>
        </div>

        {/* Centered Links */}
        <ul className="hidden md:flex gap-10 font-semibold text-white">
          <li className="hover:text-yellow-200 cursor-pointer">Dashboard</li>
          <li className="hover:text-yellow-200 cursor-pointer">Learners</li>
          <li className="hover:text-yellow-200 cursor-pointer">Performance</li>
          <li className="hover:text-yellow-200 cursor-pointer">Analytics</li>
        </ul>

        {/* Profile + Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <p className="hidden md:block text-sm font-medium">
              Hi, <span className="font-semibold">{user.name?.split(" ")[0]}</span> 👋
            </p>
          )}
          <button className="hidden md:flex items-center justify-center bg-white text-green-700 rounded-full p-2 shadow">
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-[#4E6D2D] hover:bg-[#3d5623] px-3 py-1.5 rounded-lg text-sm font-medium shadow"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-[#4E6D2D] text-white rounded-b-2xl py-3 flex flex-col items-center gap-3 font-medium md:hidden">
            <a href="#" className="hover:text-yellow-200">Dashboard</a>
            <a href="#" className="hover:text-yellow-200">Learners</a>
            <a href="#" className="hover:text-yellow-200">Performance</a>
            <a href="#" className="hover:text-yellow-200">Analytics</a>
          </div>
        )}
      </nav>

      {/* ================= INTRO ================= */}
      <div className="w-[90%] md:w-3/4 mt-8 text-left">
        {user ? (
          <h2 className="text-2xl font-semibold text-gray-800">
            Welcome back, {user.name?.split(" ")[0]}! 👋
          </h2>
        ) : (
          <h2 className="text-2xl font-semibold text-gray-800">Loading user...</h2>
        )}
        <p className="text-gray-600 mt-1">
          Here’s what’s happening with your learners today.
        </p>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-[90%] md:w-3/4 mt-10 mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ========== STATS CARD ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#4E6D2D]">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📊</span> Your Stats
          </h2>
          <ul className="space-y-3">
            <li className="flex justify-between">
              <span>Total Learners</span>
              <span className="font-semibold">1,247</span>
            </li>
            <li className="flex justify-between">
              <span>Completion Rate</span>
              <span className="font-semibold text-green-700">87.5%</span>
            </li>
            <li className="flex justify-between">
              <span>Avg. Study Time</span>
              <span className="font-semibold">4.2 hrs</span>
            </li>
          </ul>
        </div>

        {/* ========== RECENT ASSESSMENTS ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#4E6D2D]">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📝</span> Recent Assessments
          </h2>
          <ul className="space-y-4">
            <li>
              <div className="flex justify-between mb-1 text-sm">
                <span>Machine Learning Basics</span>
                <span>92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: "92%" }}></div>
              </div>
            </li>
            <li>
              <div className="flex justify-between mb-1 text-sm">
                <span>Python for Data Science</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: "85%" }}></div>
              </div>
            </li>
            <li>
              <div className="flex justify-between mb-1 text-sm">
                <span>Neural Networks 101</span>
                <span>78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: "78%" }}></div>
              </div>
            </li>
          </ul>
        </div>

        {/* ========== AI INSIGHTS ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#4E6D2D]">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>💡</span> AI Insights
          </h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-green-50 border-l-4 border-green-600">
              <p className="font-semibold">Peak Engagement</p>
              <p className="text-gray-600 text-xs">
                Students are most active between 2–4 PM.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
              <p className="font-semibold">Trending Topics</p>
              <p className="text-gray-600 text-xs">
                Deep Learning modules saw +34% engagement this week.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border-l-4 border-purple-500">
              <p className="font-semibold">At-Risk Learners</p>
              <p className="text-gray-600 text-xs">
                12 students need attention. Review their progress soon.
              </p>
            </div>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#4E6D2D] col-span-1 md:col-span-1">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <button className="bg-green-700 hover:bg-green-800 text-white py-2 px-4 rounded-lg text-sm shadow">
              Create New Assessment
            </button>
            <button className="bg-white hover:bg-gray-100 border border-gray-300 py-2 px-4 rounded-lg text-sm">
              Schedule Live Session
            </button>
            <button className="bg-white hover:bg-gray-100 border border-gray-300 py-2 px-4 rounded-lg text-sm">
              View All Learners
            </button>
            <button className="bg-white hover:bg-gray-100 border border-gray-300 py-2 px-4 rounded-lg text-sm">
              Generate Report
            </button>
          </div>
        </div>

        {/* ========== PERFORMANCE OVERVIEW ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#4E6D2D] col-span-1 md:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📈</span> Performance Overview
          </h2>
          <ul className="space-y-4 text-sm">
            <li>
              <div className="flex justify-between mb-1">
                <span>Course Completion</span>
                <span>67%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div className="h-2 bg-green-600 rounded-full" style={{ width: "67%" }}></div>
              </div>
            </li>
            <li>
              <div className="flex justify-between mb-1">
                <span>Assignment Submissions</span>
                <span>89%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: "89%" }}></div>
              </div>
            </li>
            <li>
              <div className="flex justify-between mb-1">
                <span>Student Satisfaction</span>
                <span>94%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full" style={{ width: "94%" }}></div>
              </div>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer user info */}
      {user && (
        <p className="text-sm text-gray-800 mb-6">
          Logged in as <span className="font-semibold">{user.name}</span> ({user.email})
        </p>
      )}
    </section>
  );
}
