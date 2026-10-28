#!/usr/bin/env node
'use strict';

/**
 * mark-existing-users-verified.js
 *
 * One-time migration: sets isVerified = true for every existing user
 * so they are not locked out when the new login flow goes live.
 *
 * Run this BEFORE deploying the code that blocks unverified logins:
 *
 *   node scripts/mark-existing-users-verified.js
 *
 * Requires MONGODB_URI in .env (or as an environment variable).
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const User = require('../models/User');

  const result = await User.updateMany(
    { isVerified: { $ne: true } },
    { $set: { isVerified: true } }
  );

  console.log(`Updated ${result.modifiedCount} user(s) → isVerified: true`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
