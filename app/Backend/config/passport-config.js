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
const clientID = getCleanEnvVar('GOOGLE_CLIENT_ID');
const clientSecret = getCleanEnvVar('GOOGLE_CLIENT_SECRET');
const callbackURL =
    getCleanEnvVar('GOOGLE_CALLBACK_URL') ||
    (process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/auth/google/callback`
        : 'http://localhost:3000/auth/google/callback');

/**
 * IMPORTANT CHANGE:
 * Do NOT crash the app if OAuth variables are missing.
 * Only enable Google OAuth if credentials exist.
 */
if (clientID && clientSecret) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    console.log('✅ Google OAuth enabled');

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
                    const email = emails && emails[0] ? emails[0].value : null;
                    const profilePicture = photos && photos[0] ? photos[0].value : null;

                    if (!email) {
                        return done(new Error('No email found in Google profile'), null);
                    }

                    let user = await User.findOne({ googleId });

                    if (user) {
                        return done(null, user);
                    }

                    user = await User.findOne({ email });

                    if (user) {
                        user.googleId = googleId;
                        user.profilePicture = profilePicture || user.profilePicture;
                        await user.save();
                        return done(null, user);
                    }

                    const learnerId = User.generateLearnerId();

                    const newUser = new User({
                        email,
                        name: displayName || email.split('@')[0],
                        learnerId,
                        googleId,
                        authProvider: 'google',
                        isVerified: true,
                        profilePicture,
                    });

                    await newUser.save();

                    const newLearner = new Learner({
                        email,
                        name: displayName || email.split('@')[0],
                    });

                    await newLearner.save();

                    return done(null, newUser);
                } catch (error) {
                    console.error('Google OAuth Strategy Error:', error);
                    return done(error, null);
                }
            }
        )
    );
} else {
    console.warn('\n⚠️ Google OAuth disabled: Missing environment variables.\n');
    console.warn('To enable Google OAuth, set:');
    console.warn('GOOGLE_CLIENT_ID');
    console.warn('GOOGLE_CLIENT_SECRET');
    console.warn('GOOGLE_CALLBACK_URL\n');
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
