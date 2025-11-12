const { verifyAccessToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
