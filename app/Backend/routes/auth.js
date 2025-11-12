const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateSalt, sha256Hash } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { loginUser, logoutUser } = require('../middleware/authController');
const crypto = require('crypto');

const PEPPER = process.env.PEPPER || '';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const salt = generateSalt();
    const passwordHash = sha256Hash(password, salt, PEPPER);
    const newUser = new User({ email, name, salt, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Use the authController for login
router.post('/login', loginUser);

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

// Use the authController for logout  
router.post('/logout', logoutUser);

module.exports = router;
