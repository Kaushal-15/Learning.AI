const crypto = require('crypto');

function generateSalt(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function sha256Hash(password, salt, pepper = '') {
  const hmac = crypto.createHmac('sha256', salt);
  hmac.update(password + pepper);
  return hmac.digest('hex');
}

module.exports = { generateSalt, sha256Hash };