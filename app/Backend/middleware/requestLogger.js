const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/reqLog.txt');

function requestLogger(req, res, next) {
  const start = Date.now();

  // Capture response end to log status & duration
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.ip} ${req.method} ${
      req.originalUrl
    } ${res.statusCode} ${duration}ms\n`;

    // Append log to file asynchronously
    fs.appendFile(logFile, log, (err) => {
      if (err) console.error('❌ Error writing log:', err);
    });
  });

  next();
}

module.exports = requestLogger;
