const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Mandatory Routes
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/api/auth/check-username', (req, res) => {
  res.json({ available: true });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({ success: true });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Export the app for Vercel Serverless
module.exports = app;
