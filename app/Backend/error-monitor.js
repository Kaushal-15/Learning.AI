#!/usr/bin/env node

/**
 * Real-time Error Monitor
 * Monitors the application for common errors and provides solutions
 */

const fs = require('fs');
const path = require('path');

class ErrorMonitor {
  constructor() {
    this.errorPatterns = {
      'GEMINI_API_KEY': {
        pattern: /GEMINI_API_KEY.*not.*configured/i,
        solution: 'Configure GEMINI_API_KEY in .env file with a valid Google AI Studio API key'
      },
      'MongoDB Connection': {
        pattern: /MongoDB.*connection.*failed/i,
        solution: 'Ensure MongoDB is running on localhost:27017 or update MONGODB_URI in .env'
      },
      'JWT Secret': {
        pattern: /JWT.*secret.*not.*defined/i,
        solution: 'Configure JWT_SECRET and JWT_REFRESH_SECRET in .env file'
      },
      'Port Already in Use': {
        pattern: /EADDRINUSE.*3000/i,
        solution: 'Port 3000 is already in use. Kill the process or change PORT in .env'
      },
      'Model Not Found': {
        pattern: /model.*not found|404.*model/i,
        solution: 'Update Gemini model name in contentGenerator.js or check API key permissions'
      }
    };
  }

  analyzeError(errorText) {
    const solutions = [];
    
    for (const [errorType, config] of Object.entries(this.errorPatterns)) {
      if (config.pattern.test(errorText)) {
        solutions.push({
          type: errorType,
          solution: config.solution
        });
      }
    }
    
    return solutions;
  }

  generateReport(errors) {
    if (errors.length === 0) {
      return '✅ No common errors detected!';
    }

    let report = '🔍 Error Analysis Report:\n\n';
    
    errors.forEach((error, index) => {
      report += `${index + 1}. ${error.type}\n`;
      report += `   Solution: ${error.solution}\n\n`;
    });

    report += '📝 Quick Fix Commands:\n';
    report += '   npm run dev          # Restart development server\n';
    report += '   node test-backend.js # Test backend components\n';
    report += '   npm install          # Reinstall dependencies\n';

    return report;
  }
}

// Export for use in other scripts
if (require.main === module) {
  console.log('🔍 Error Monitor initialized. Use this script to analyze error logs.');
  console.log('Example: node error-monitor.js "your error message here"');
  
  if (process.argv[2]) {
    const monitor = new ErrorMonitor();
    const errors = monitor.analyzeError(process.argv[2]);
    console.log(monitor.generateReport(errors));
  }
}

module.exports = ErrorMonitor;
