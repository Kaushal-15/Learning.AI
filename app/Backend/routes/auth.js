const express = require('express');
const router = express.Router();
const { register, verifyOTP, loginUser, logoutUser } = require('../controllers/authController');
const { verifyRefreshToken, signAccessToken } = require('../utils/jwt');
const User = require('../models/User');

// Register a new user
router.post('/register', register);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Login user
router.post('/login', loginUser);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = signAccessToken({ id: user._id, email: user.email });
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({ message: 'Token refreshed' });
  } catch (error) {
    console.error(error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// Logout user
router.post('/logout', logoutUser);

// Check name availability (Legacy path param)
router.get('/check-name/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        available: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    const existingUser = await User.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    res.json({
      available: !existingUser,
      message: existingUser ? 'Username already taken' : 'Username available'
    });
  } catch (error) {
    console.error('Name check error:', error);
    res.status(500).json({
      available: false,
      message: 'Error checking name availability'
    });
  }
});

/**
 * @route   GET/POST /api/auth/check-username
 * @desc    Check if username is available (Frontend requested fix)
 * @access  Public
 */
const checkUsernameHandler = async (req, res) => {
  try {
    // Force JSON content type
    res.setHeader('Content-Type', 'application/json');

    // accepting from query (GET) or body (POST)
    const username = req.query.username || req.body.username || req.params.username || req.query.name || req.body.name;

    if (!username || username.trim().length < 2) {
      return res.status(400).json({
        available: false,
        message: 'Username must be at least 2 characters'
      });
    }

    // Check DB
    const existingUser = await User.findOne({
      name: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    return res.status(200).json({
      available: !existingUser,
      username: username.trim(),
      message: existingUser ? 'Username is taken' : 'Username is available'
    });

  } catch (error) {
    console.error('Check Username Error:', error);
    // Return JSON error, never HTML
    return res.status(500).json({
      available: false,
      message: 'Server error checking username',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

router.get('/check-username', checkUsernameHandler);
router.post('/check-username', checkUsernameHandler);

module.exports = router;


