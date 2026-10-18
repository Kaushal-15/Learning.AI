/**
 * Learning.AI — Vercel Serverless Entry Point
 * File: app/Backend/api/index.js
 *
 * Delegates requests to the main Express application.
 * The root directory of the Vercel backend project is app/Backend,
 * so "../server" resolves to app/Backend/server.js.
 */

module.exports = require('../server');
