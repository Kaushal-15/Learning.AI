/**
 * Health Check Script
 * Verifies database connection and basic system health before starting server
 */

const mongoose = require('mongoose');
require('dotenv').config();

const checkHealth = async () => {
    console.log('\n🔍 Running health checks...\n');

    // Check MongoDB connection
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-ai';
        console.log('📡 Connecting to MongoDB...');

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ MongoDB connection successful');
        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    }

    // Check required environment variables
    console.log('\n🔐 Checking environment variables...');
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
        console.warn('   Server will use defaults where possible');
    } else {
        console.log('✅ All required environment variables present');
    }

    // Check Cloud Storage (S3 / R2) configuration
    const storageService = require('./services/storageService');
    const storageConfig = storageService.getStorageConfig();
    if (storageConfig.isConfigured) {
        console.log(`✅ Cloud Storage configured: Bucket [${storageConfig.bucket}], Region [${storageConfig.region}]`);
    } else {
        console.log('ℹ️  Cloud Storage: Not configured (STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY optional)');
    }

    console.log('\n✅ Health checks passed! Starting server...\n');
    process.exit(0);
};

checkHealth();
