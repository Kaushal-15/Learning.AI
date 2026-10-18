const express = require('express');
const router = express.Router();
const passport = require('../config/passport-config');
const { googleCallback } = require('../controllers/authController');

const getFrontendUrl = () => {
    let url = process.env.FRONTEND_URL;
    if (!url || url.includes('YOUR-')) {
        url = process.env.VERCEL ? 'https://learning-ai-rswf.vercel.app' : 'http://localhost:5173';
    }
    return url.replace(/\/$/, '');
};

const ensureGoogleStrategy = (req, res, next) => {
    if (!passport._strategy('google')) {
        return res.redirect(`${getFrontendUrl()}/login?error=oauth_not_configured`);
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
    ['/google/callback', '/google/callback/'],
    ensureGoogleStrategy,
    (req, res, next) => {
        passport.authenticate('google', {
            failureRedirect: `${getFrontendUrl()}/login?error=oauth_failed`,
            session: true,
        })(req, res, next);
    },
    googleCallback
);

module.exports = router;
