const User = require('../models/User');
const Learner = require('../models/Learner');
const { generateSalt, sha256Hash } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { issueOtp } = require('../services/otpService');
const connectDB = require('../config/database');

const PEPPER = process.env.PEPPER || '';

// Cookie options helper — ensures consistent settings across all auth endpoints.
// Cross-site (two different Vercel domains) requires sameSite:'none' + secure:true.
const cookieOpts = (maxAgeMs) => ({
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: (process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)) ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs
});

/**
 * Escape special regex characters so user input can be used safely inside RegExp.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.register = async (req, res) => {
    try {
        await connectDB();
        const { email, password, name } = req.body;

        // Validate required fields are strings
        if (!email || typeof email !== 'string' ||
            !password || typeof password !== 'string' ||
            !name || typeof name !== 'string') {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }

        const trimmedEmail = email.toLowerCase().trim();
        const trimmedName = name.trim();

        // Validate name length
        if (trimmedName.length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters long' });
        }

        // Validate password length
        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({ message: 'Password must be between 8 and 128 characters' });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email: trimmedEmail });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Check if name already exists (case-insensitive, escaped for regex safety)
        const existingName = await User.findOne({
            name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') }
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
            email: trimmedEmail,
            name: trimmedName,
            learnerId,
            salt,
            passwordHash,
            isVerified: false,
        });
        await newUser.save();

        // Create corresponding learner profile
        const newLearner = new Learner({
            email: trimmedEmail,
            name: trimmedName,
        });
        await newLearner.save();

        // Send signup OTP through the new service
        let emailSent = true;
        try {
            await issueOtp(newUser, 'signup');
        } catch (emailError) {
            console.error('Failed to send signup OTP:', emailError);
            emailSent = false;
        }

        res.status(201).json({
            message: 'Account created successfully. Please verify your email.',
            email: trimmedEmail,
            learnerId: learnerId,
            needsRoadmapSelection: true,
            requiresVerification: true,
            emailSent,
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
};

// verifyOTP is now handled by otpAuthController.js

exports.loginUser = async (req, res) => {
    try {
        await connectDB();
        const { email, password } = req.body;

        // Validate inputs are strings
        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const trimmedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: trimmedEmail });
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

        // Block unverified users — tell the frontend to redirect to verification
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                email: user.email,
                message: 'Please verify your email before signing in.',
            });
        }

        // Generate tokens using utility functions
        const accessToken = signAccessToken({ id: user._id, email: user.email });
        const refreshToken = signRefreshToken({ id: user._id, email: user.email });

        // Store refresh token in user document using findByIdAndUpdate to avoid validation issues
        await User.findByIdAndUpdate(user._id, { refreshToken }, { runValidators: false });

        // SET "accessToken" COOKIE (matching middleware expectation)
        res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000)); // 15 mins

        // SET "refreshToken" COOKIE
        res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000)); // 7 days


        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isVerified: user.isVerified
            },
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
        res.clearCookie('accessToken', cookieOpts(0));
        res.clearCookie('refreshToken', cookieOpts(0));


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

/**
 * Google OAuth Callback Handler
 * Called after successful Google authentication
 * Generates JWT tokens and sets cookies
 */
exports.googleCallback = async (req, res) => {
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || frontendUrl.includes('YOUR-')) {
        frontendUrl = process.env.VERCEL ? 'https://learning-ai-rswf.vercel.app' : 'http://localhost:5173';
    }
    frontendUrl = frontendUrl.replace(/\/$/, '');

    try {
        const user = req.user;

        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }

        // Generate JWT tokens
        const accessToken = signAccessToken({ id: user._id, email: user.email });
        const refreshToken = signRefreshToken({ id: user._id, email: user.email });

        // Store refresh token in user document
        await User.findByIdAndUpdate(user._id, { refreshToken }, { runValidators: false });

        // Set access token cookie
        res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));

        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

        // Redirect to frontend dashboard with token in URL (for cross-domain storage fallback)
        res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(accessToken)}`);

    } catch (error) {
        console.error("Google OAuth Callback Error:", error);
        res.redirect(`${frontendUrl}/login?error=server_error`);
    }
};

