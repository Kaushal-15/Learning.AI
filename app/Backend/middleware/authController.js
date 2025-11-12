// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sha256Hash } = require("../utils/crypto");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

const PEPPER = process.env.PEPPER || '';

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Use the same hashing method as registration
    const hash = sha256Hash(password, user.salt, PEPPER);
    if (hash !== user.passwordHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Generate tokens using utility functions
    const accessToken = signAccessToken({ id: user._id, email: user.email });
    const refreshToken = signRefreshToken({ id: user._id, email: user.email });

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

// SET "accessToken" COOKIE (matching middleware expectation)
res.cookie("accessToken", accessToken, {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  path: "/",
  maxAge: 15 * 60 * 1000, // 15 mins for access token
});

// SET "refreshToken" COOKIE
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Optional: store refreshToken in DB or httpOnly cookie
// res.cookie("refreshToken", refreshToken, { ... });

return res.status(200).json({
  success: true,
  message: "Login successful",
  user: { id: user._id, email: user.email },
});

  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login.",
    });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    // Clear both cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: process.env.COOKIE_SAMESITE || "lax",
      path: "/",
    });
    
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true", 
      sameSite: process.env.COOKIE_SAMESITE || "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout.",
    });
  }
};
