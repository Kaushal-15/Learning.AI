const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  refreshToken: { type: String } // optional store for refresh token validation
});

module.exports = mongoose.model('User', userSchema);
