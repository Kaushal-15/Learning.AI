const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

if (isProd) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProd) throw new Error('JWT_SECRET environment variable is required in production');
    return 'dev-jwt-secret-key-change-in-production';
  }
  return secret;
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (isProd) throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    return 'dev-refresh-secret-key-change-in-production';
  }
  return secret;
}

function signAccessToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

function signRefreshToken(payload) {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, getRefreshSecret(), { expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
