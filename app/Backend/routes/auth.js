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
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Check if name already exists (case-insensitive)
    const existingName = await User.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    if (existingName) {
      return res.status(409).json({ message: 'Username already taken. Please choose a different name.' });
    }

    // Generate unique learner ID
    let learnerId;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 5) {
      learnerId = User.generateLearnerId();
      const existingLearnerId = await User.findOne({ learnerId });
      if (!existingLearnerId) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Failed to generate unique learner ID. Please try again.' });
    }

    // Create user
    const salt = generateSalt();
    const passwordHash = sha256Hash(password, salt, PEPPER);
    const newUser = new User({ 
      email, 
      name: name.trim(), 
      learnerId,
      salt, 
      passwordHash 
    });
    await newUser.save();

    // Create corresponding learner profile
    const Learner = require('../models/Learner');
    const newLearner = new Learner({
      email,
      name: name.trim()
    });
    await newLearner.save();

    res.status(201).json({ 
      message: 'Account created successfully',
      learnerId: learnerId
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' ? 'Email already registered' : 
                     field === 'name' ? 'Username already taken' : 
                     'Account already exists';
      return res.status(409).json({ message });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
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

// Check name availability
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

module.exports = router;
