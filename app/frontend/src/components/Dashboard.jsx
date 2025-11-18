import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, BookOpen, Target, TrendingUp } from "lucide-react";
import "../index.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [learnerData, setLearnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  // ✅ Fetch logged-in user details and check onboarding status
  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        // Fetch user profile
        const userRes = await fetch("http://localhost:3000/api/profile/me", {
          method: "GET",
          credentials: "include",
        });
        const userData = await userRes.json();
        
        if (userRes.ok && userData.success && userData.user) {
          setUser(userData.user);
          
          // Check if user has completed onboarding
          if (!userData.user.hasCompletedOnboarding) {
            // Redirect to roadmap selection
            navigate("/roadmap");
            return;
          }
          
          // Fetch learner data for existing users
          try {
            const learnerRes = await fetch("http://localhost:3000/api/learners/me", {
              method: "GET",
              credentials: "include",
            });
            const learnerData = await learnerRes.json();
            
            if (learnerRes.ok && learnerData.success) {
              setLearnerData(learnerData.data);
            }
          } catch (err) {
            console.error("Error fetching learner data:", err);
          }
        } else {
          console.warn("Not logged in:", userData.message);
          navigate("/login");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndData();
  }, [navigate]);

  // Handle roadmap change
  const handleRoadmapChange = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/profile/reset-progress", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setShowRoadmapModal(false);
        navigate("/roadmap");
      } else {
        console.error("Failed to reset progress");
      }
    } catch (err) {
      console.error("Error resetting progress:", err);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoadmapTitle = (roadmap) => {
    const roadmapTitles = {
      'full-stack': 'Full-Stack Development',
      'frontend': 'Frontend Development', 
      'backend': 'Backend Development',
      'mobile': 'Mobile App Development',
      'database': 'Database & Data Science',
      'cybersecurity': 'Cybersecurity',
      'devops': 'DevOps & Cloud',
      'ai-ml': 'AI & Machine Learning'
    };
    return roadmapTitles[roadmap] || roadmap;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================= HEADER ================= */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#344F1F] rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Learning.AI</h1>
              </div>
            </div>

            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => navigate("/dashboard")}
                className="text-[#344F1F] font-medium border-b-2 border-[#344F1F] pb-1"
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigate("/learn")}
                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
              >
                Learn
              </button>
              <button 
                onClick={() => navigate("/test")}
                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
              >
                Tests
              </button>
              <button 
                onClick={() => navigate("/profile")}
                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
              >
                Profile
              </button>
            </nav>

            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {user.name?.split(" ")[0]}
                  </p>
                  <p className="text-xs text-gray-500">{user.selectedRoadmap ? getRoadmapTitle(user.selectedRoadmap) : 'Learning Path'}</p>
                </div>
              )}
              <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>



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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* ========== STATS CARD ========== */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Learning Stats</h3>
              <TrendingUp className="w-5 h-5 text-[#344F1F]" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Questions Answered</span>
                <span className="text-lg font-semibold text-gray-900">{learnerData?.totalQuestionsAnswered || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Accuracy</span>
                <span className="text-lg font-semibold text-[#344F1F]">
                  {learnerData?.overallAccuracy ? `${Math.round(learnerData.overallAccuracy * 100)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Streak</span>
                <span className="text-lg font-semibold text-gray-900">{learnerData?.currentStreak || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Study Time</span>
                <span className="text-lg font-semibold text-gray-900">
                  {learnerData?.totalTimeSpent ? `${Math.round(learnerData.totalTimeSpent / 60)} min` : '0 min'}
                </span>
              </div>
            </div>
          </div>

          {/* ========== RECENT PROGRESS ========== */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Progress</h3>
              <BookOpen className="w-5 h-5 text-[#344F1F]" />
            </div>
          {learnerData?.categoryMastery && Object.keys(learnerData.categoryMastery).length > 0 ? (
            <ul className="space-y-4">
              {Object.entries(learnerData.categoryMastery)
                .sort(([,a], [,b]) => new Date(b.lastAssessed) - new Date(a.lastAssessed))
                .slice(0, 3)
                .map(([category, mastery]) => (
                <li key={category}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{Math.round(mastery.level)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-600" 
                      style={{ width: `${mastery.level}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No assessments yet</p>
              <p className="text-sm">Start learning to see your progress here!</p>
            </div>
          )}
        </div>

          {/* ========== AI INSIGHTS ========== */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              <Target className="w-5 h-5 text-[#344F1F]" />
            </div>
            <div className="space-y-3">
              {learnerData?.strongAreas && learnerData.strongAreas.length > 0 && (
                <div className="p-3 rounded-lg bg-green-50 border-l-4 border-green-500">
                  <p className="font-medium text-green-800">Strong Areas</p>
                  <p className="text-green-600 text-sm">
                    You excel in: {learnerData.strongAreas.slice(0, 2).join(', ')}
                  </p>
                </div>
              )}
              
              {learnerData?.weakAreas && learnerData.weakAreas.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-50 border-l-4 border-orange-500">
                  <p className="font-medium text-orange-800">Focus Areas</p>
                  <p className="text-orange-600 text-sm">
                    Consider practicing: {learnerData.weakAreas.slice(0, 2).join(', ')}
                  </p>
                </div>
              )}
              
              {learnerData?.currentStreak > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                  <p className="font-medium text-blue-800">Great Streak!</p>
                  <p className="text-blue-600 text-sm">
                    You're on a {learnerData.currentStreak} question streak. Keep it up!
                  </p>
                </div>
              )}
              
              {(!learnerData?.strongAreas?.length && !learnerData?.weakAreas?.length && !learnerData?.currentStreak) && (
                <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400">
                  <p className="font-medium text-gray-700">Start Learning</p>
                  <p className="text-gray-600 text-sm">
                    Begin your journey to see personalized insights here!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate("/learn")}
                className="flex items-center gap-3 p-4 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Start Learning</div>
                  <div className="text-sm opacity-90">Continue your roadmap</div>
                </div>
              </button>
              <button 
                onClick={() => navigate("/test")}
                className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Take Test</div>
                  <div className="text-sm opacity-90">Assess your skills</div>
                </div>
              </button>
              <button 
                onClick={() => setShowRoadmapModal(true)}
                className="flex items-center gap-3 p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Target className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Change Path</div>
                  <div className="text-sm opacity-90">Switch roadmap</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <User className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">View Profile</div>
                  <div className="text-sm text-gray-500">Check progress</div>
                </div>
              </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {user && (
            <div className="text-center text-sm text-gray-500">
              Logged in as <span className="font-medium text-gray-700">{user.name}</span> • 
              Learner ID: <span className="font-mono">{user.learnerId}</span>
            </div>
          )}
        </div>
      </footer>

      {/* Roadmap Change Modal */}
      {showRoadmapModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Change Learning Path</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Changing your learning path will reset your current progress including:
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mb-4 pl-4">
                <li>• All category mastery levels</li>
                <li>• Learning streaks and statistics</li>
                <li>• Completed assessments</li>
                <li>• Study time records</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 font-medium text-sm">
                  This action cannot be undone!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRoadmapModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRoadmapChange}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reset & Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
