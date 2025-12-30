#!/usr/bin/env node
/**
 * Fix Missing RoadmapId Script
 * Assigns a default roadmapId to all daily learning plans and questions that are missing it
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Get the first roadmap ID (we'll use this as default)
        const roadmaps = await db.collection('roadmaps').find({}).limit(1).toArray();
        if (roadmaps.length === 0) {
            console.error('❌ No roadmaps found in database');
            process.exit(1);
        }

        const defaultRoadmapId = roadmaps[0]._id.toString();
        console.log(`ℹ️  Using default roadmapId: ${defaultRoadmapId}`);

        // Fix daily learning plans
        const plansResult = await db.collection('dailylearningplans').updateMany(
            { roadmapId: { $exists: false } },
            { $set: { roadmapId: defaultRoadmapId } }
        );
        console.log(`✅ Updated ${plansResult.modifiedCount} daily learning plans`);

        // Fix questions (if any are missing roadmapId)
        const questionsResult = await db.collection('questions').updateMany(
            { roadmapId: { $exists: false } },
            { $set: { roadmapId: defaultRoadmapId } }
        );
        console.log(`✅ Updated ${questionsResult.modifiedCount} questions`);

        console.log('\n✨ Fix completed successfully!');
        console.log('Next step: Run verification script');
        console.log('  node verify-db.js');

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

main();
