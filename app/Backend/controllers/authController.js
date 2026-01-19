const User = require('../models/User');
const Learner = require('../models/Learner');
const { generateSalt, sha256Hash } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOTP } = require('../utils/mailer');
const crypto = require('crypto');

const PEPPER = process.env.PEPPER || '';

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.register = async (req, res) => {
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

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const salt = generateSalt();
        const passwordHash = sha256Hash(password, salt, PEPPER);
        const newUser = new User({
            email,
            name: name.trim(),
            learnerId,
            salt,
            passwordHash,
            isVerified: false,
            verificationCode: otp,
            verificationExpires: otpExpires
        });
        await newUser.save();

        // Create corresponding learner profile
        const newLearner = new Learner({
            email,
            name: name.trim()
        });
        await newLearner.save();

        // Send OTP email
        try {
            await sendOTP(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Optional: Delete user if email fails, or just return warning
            // For now, we keep the user but they need to resend OTP (logic to be added if needed)
        }

        res.status(201).json({
            message: 'Account created successfully. Please verify your email.',
            learnerId: learnerId,
            needsRoadmapSelection: true,
            requiresVerification: true
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

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(200).json({ message: 'User already verified' });
        }

        if (user.verificationCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.verificationExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Verify user
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Server error during verification' });
    }
};

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

        // Store refresh token in user document using findByIdAndUpdate to avoid validation issues
        await User.findByIdAndUpdate(user._id, { refreshToken }, { runValidators: false });

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

/**
 * Google OAuth Callback Handler
 * Called after successful Google authentication
 * Generates JWT tokens and sets cookies
 */
exports.googleCallback = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
        }

        // Generate JWT tokens
        const accessToken = signAccessToken({ id: user._id, email: user.email });
        const refreshToken = signRefreshToken({ id: user._id, email: user.email });

        // Store refresh token in user document
        await User.findByIdAndUpdate(user._id, { refreshToken }, { runValidators: false });

        // Set access token cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === "true",
            sameSite: process.env.COOKIE_SAMESITE || "lax",
            path: "/",
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Set refresh token cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === "true",
            sameSite: process.env.COOKIE_SAMESITE || "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect to frontend dashboard
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);

    } catch (error) {
        console.error("Google OAuth Callback Error:", error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
};

