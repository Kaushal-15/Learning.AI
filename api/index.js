const express = require('express');
const app = express();

app.use(express.json());

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

// 404 Handler for unknown routes to ensure JSON response
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
