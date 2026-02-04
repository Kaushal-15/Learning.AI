const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Learner = require('../models/Learner');

// Helper function to clean environment variables (removes quotes)
const getCleanEnvVar = (varName) => {
    const value = process.env[varName];
    if (!value) return null;
    // Remove surrounding quotes if present
    return value.replace(/^["']|["']$/g, '').trim();
};

// Get and validate Google OAuth credentials
const clientID = getCleanEnvVar('GOOGLE_CLIENT_ID');
const clientSecret = getCleanEnvVar('GOOGLE_CLIENT_SECRET');
const callbackURL = getCleanEnvVar('GOOGLE_CALLBACK_URL') ||
                    (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/auth/google/callback` : 'http://localhost:3000/auth/google/callback');

if (!clientID || !clientSecret) {
    console.error('\n❌ Missing required Google OAuth environment variables!\n');
    console.error('Add these to your .env file (WITHOUT quotes):');
    console.error('  GOOGLE_CLIENT_ID=your_client_id_here');
    console.error('  GOOGLE_CLIENT_SECRET=your_client_secret_here');
    console.error('  GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback');
    console.error('  SESSION_SECRET=your_random_secret\n');
    throw new Error('Missing Google OAuth credentials');
}

/**
 * Google OAuth 2.0 Strategy Configuration
 * Handles user authentication via Google Sign-In
 */
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
                // Extract user information from Google profile
                const { id: googleId, emails, displayName, photos } = profile;
                const email = emails && emails[0] ? emails[0].value : null;
                const profilePicture = photos && photos[0] ? photos[0].value : null;

                if (!email) {
                    return done(new Error('No email found in Google profile'), null);
                }

                // Check if user already exists with this Google ID
                let user = await User.findOne({ googleId });

                if (user) {
                    // User exists with Google ID - log them in
                    return done(null, user);
                }

                // Check if user exists with this email (account linking)
                user = await User.findOne({ email });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = googleId;
                    user.profilePicture = profilePicture || user.profilePicture;

                    // If user was created via email/password, they can now use both methods
                    await user.save();
                    return done(null, user);
                }

                // Create new user with Google OAuth
                const learnerId = User.generateLearnerId();

                const newUser = new User({
                    email,
                    name: displayName || email.split('@')[0],
                    learnerId,
                    googleId,
                    authProvider: 'google',
                    isVerified: true, // Google handles email verification
                    profilePicture,
                    // passwordHash and salt are not required for OAuth users
                });

                await newUser.save();

                // Create corresponding learner profile
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

/**
 * Serialize user for session storage
 * Only store user ID in session
 */
passport.serializeUser((user, done) => {
    done(null, user._id);
});

/**
 * Deserialize user from session
 * Retrieve full user object from database
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
