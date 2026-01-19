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
    res.json({
      user: {
        ...user.toObject(),
        id: user._id
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get current user profile (used by Dashboard)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -salt -refreshToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        learnerId: user.learnerId,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ✅ Update user profile and settings
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, settings } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (settings) {
      // Use dot notation to update nested fields without overwriting the whole object if needed
      // But here we might want to merge or replace. Let's assume we replace the provided keys.
      // For simplicity in Mongoose, we can just set the settings object if provided,
      // or merge it. Let's do a merge approach for better UX.
      const user = await User.findById(req.user.id);
      updateData.settings = { ...user.settings, ...settings };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash -salt -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        learnerId: user.learnerId,
        settings: user.settings
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;
