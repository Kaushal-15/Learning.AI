const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

// Middleware to check JWT from cookies
function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// ✅ Profile route
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -salt -refreshToken');
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
