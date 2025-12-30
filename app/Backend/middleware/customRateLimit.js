const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 uploads per windowMs
    keyGenerator: (req) => req.user ? (req.user.id || req.user._id).toString() : req.ip,
    message: {
        status: 'error',
        message: 'Too many file uploads from this account, please try again after an hour'
    }
});

const quizGenLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10, // Limit each IP to 10 quiz generations per windowMs
    keyGenerator: (req) => req.user ? (req.user.id || req.user._id).toString() : req.ip,
    message: {
        status: 'error',
        message: 'Daily quiz generation limit reached, please try again tomorrow'
    }
});

module.exports = {
    uploadLimiter,
    quizGenLimiter
};
