const passport = require('passport');
const User = require('../models/User');
const Learner = require('../models/Learner');

// Helper function to clean environment variables (removes quotes)
const getCleanEnvVar = (varName) => {
    const value = process.env[varName];
    if (!value) return null;
    return value.replace(/^["']|["']$/g, '').trim();
};

// Get and validate Google OAuth credentials
const clientIDRaw = getCleanEnvVar('GOOGLE_CLIENT_ID');
const isClientPlaceholder = !clientIDRaw || clientIDRaw.includes('<') || clientIDRaw.includes('YOUR_GOOGLE');
const clientID = isClientPlaceholder ? '756099397454-htk0oo84c7uvld0t9hj7ieng980k08vf.apps.googleusercontent.com' : clientIDRaw;

const clientSecret = getCleanEnvVar('GOOGLE_CLIENT_SECRET');

const callbackRaw = getCleanEnvVar('GOOGLE_CALLBACK_URL');
const isCallbackPlaceholder = !callbackRaw || callbackRaw.includes('<') || callbackRaw.includes('YOUR-DEPLOYED') || callbackRaw.includes('YOUR_');
let callbackURL = isCallbackPlaceholder ? null : callbackRaw;

if (!callbackURL) {
    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('YOUR')) {
        callbackURL = `${process.env.BACKEND_URL.replace(/\/$/, '')}/auth/google/callback`;
    } else if (process.env.VERCEL) {
        callbackURL = 'https://learning-ai-mocha.vercel.app/auth/google/callback';
    } else {
        callbackURL = 'http://localhost:3000/auth/google/callback';
    }
}

/**
 * Register GoogleStrategy if clientID, clientSecret, and callbackURL are present.
 */
if (clientID && clientSecret && callbackURL) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    console.log('✅ Google OAuth enabled with callback:', callbackURL);

    passport.use(
        new GoogleStrategy(
            {
                clientID,
                clientSecret,
                callbackURL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const { id: googleId, emails, displayName, photos } = profile;
                    const email = emails && emails[0] ? emails[0].value.toLowerCase().trim() : null;
                    const profilePicture = photos && photos[0] ? photos[0].value : null;

                    if (!email) {
                        return done(new Error('No email found in Google profile'), null);
                    }

                    // 1. Check if user already exists with this googleId
                    let user = await User.findOne({ googleId });
                    if (user) {
                        return done(null, user);
                    }

                    // 2. Check if user already exists with this email (e.g. registered locally)
                    user = await User.findOne({ email });
                    if (user) {
                        user.googleId = googleId;
                        if (profilePicture && !user.profilePicture) {
                            user.profilePicture = profilePicture;
                        }
                        user.isVerified = true;
                        await user.save();
                        return done(null, user);
                    }

                    // 3. New user: generate collision-free unique username and learnerId
                    const learnerId = User.generateLearnerId();
                    let baseName = (displayName || email.split('@')[0]).trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
                    if (baseName.length < 2) baseName = `user_${Date.now().toString(36)}`;
                    
                    let uniqueName = baseName;
                    let counter = 1;
                    while (await User.findOne({ name: uniqueName })) {
                        uniqueName = `${baseName}_${counter++}`;
                    }

                    const newUser = new User({
                        email,
                        name: uniqueName,
                        learnerId,
                        googleId,
                        authProvider: 'google',
                        isVerified: true,
                        profilePicture,
                    });

                    await newUser.save();

                    // Ensure Learner profile exists
                    let learner = await Learner.findOne({ email });
                    if (!learner) {
                        learner = new Learner({
                            email,
                            name: uniqueName,
                        });
                        await learner.save();
                    }

                    return done(null, newUser);
                } catch (error) {
                    console.error('Google OAuth Strategy Error:', error);
                    return done(error, null);
                }
            }
        )
    );
} else {
    console.warn('\n⚠️ Google OAuth waiting for GOOGLE_CLIENT_SECRET in environment.\n');
}

/**
 * Serialize user for session storage
 */
passport.serializeUser((user, done) => {
    done(null, user._id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
