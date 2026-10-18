const express = require('express');
const router = express.Router();
const passport = require('../config/passport-config');
const { googleCallback } = require('../controllers/authController');

const ensureGoogleStrategy = (req, res, next) => {
    if (!passport._strategy('google')) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl.replace(/\/$/, '')}/login?error=oauth_not_configured`);
    }
    next();
};

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get(
    '/google',
    ensureGoogleStrategy,
    passport.authenticate('google', {
        scope: ['profile', 'email'],
    })
);

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback URL
 * @access  Public
 */
router.get(
    '/google/callback',
    ensureGoogleStrategy,
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
        session: true,
    }),
    googleCallback
);

module.exports = router;
