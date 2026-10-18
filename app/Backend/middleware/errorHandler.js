/**
 * errorHandler.js — Central Express error handler.
 *
 * Always returns JSON.
 * Uses err.status || err.statusCode || 500.
 * Includes stack trace only when NODE_ENV !== 'production'.
 * Logs every error to console.error so it appears in Vercel function logs.
 */

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    // Always log so errors appear in Vercel function logs.
    console.error('[ErrorHandler]', {
        message: err.message,
        status: err.status || err.statusCode,
        path: req.originalUrl,
        method: req.method,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });

    let statusCode = err.status || err.statusCode || 500;
    let message = err.message || 'Server Error';

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 404;
        message = 'Resource not found';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Multer / payload-too-large
    if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Payload too large. Maximum upload size is 4 MB.';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;