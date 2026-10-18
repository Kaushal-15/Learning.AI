const jwt = require('jsonwebtoken');

function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(payload) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, refreshSecret, { expiresIn });
}

function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production';
  return jwt.verify(token, secret);
}

function verifyRefreshToken(token) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';
  return jwt.verify(token, refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
