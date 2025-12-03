#!/bin/bash

echo "🧹 Clearing content cache..."

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Clear cache using Node
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const ContentCache = require('./models/ContentCache');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dynamic-mcq-system')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return ContentCache.deleteMany({});
  })
  .then((result) => {
    console.log(\`✅ Cleared \${result.deletedCount} cached items\`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting backend server..."
    npm run dev
else
    echo "❌ Failed to clear cache. Please check MongoDB connection."
    exit 1
fi