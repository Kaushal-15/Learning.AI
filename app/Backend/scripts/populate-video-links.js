const mongoose = require('mongoose');
const DailyLearningPlan = require('../models/DailyLearningPlan');
const youtubeService = require('../services/youtube.service');
require('dotenv').config();

/**
 * Populate Video Links Script
 * Adds real YouTube video links to all daily learning plans
 */

const ROADMAPS = [
    'full-stack-development',
    'frontend-development',
    'backend-development',
    'mobile-app-development',
    'database-data-science',
    'cybersecurity',
    'devops-cloud',
    'ai-machine-learning'
];

async function populateVideoLinks() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        let totalUpdated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const roadmapId of ROADMAPS) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Processing: ${roadmapId}`);
            console.log('='.repeat(60));

            try {
                // Fetch all daily learning plans for this roadmap
                const plans = await DailyLearningPlan.find({ roadmapId }).sort({ day: 1 });
                console.log(`Found ${plans.length} daily learning plans`);

                for (const plan of plans) {
                    try {
                        // Check if videos already exist
                        const hasVideos = plan.learningOptions?.video?.links &&
                            plan.learningOptions.video.links.length > 0 &&
                            plan.learningOptions.video.links[0].url.includes('/embed/');

                        if (hasVideos) {
                            console.log(`  Day ${plan.day}: ${plan.topic} - Already has videos, skipping`);
                            totalSkipped++;
                            continue;
                        }

                        console.log(`  Day ${plan.day}: ${plan.topic} - Fetching videos...`);

                        // Generate search queries based on topic
                        const topic = plan.topic;
                        const roadmapName = roadmapId.replace(/-/g, ' ');

                        // Find best videos for this topic
                        const videos = await youtubeService.findBestVideos(topic, roadmapName, 5);

                        if (videos && videos.length > 0) {
                            // Format videos for database
                            const videoLinks = youtubeService.formatForDatabase(videos);

                            // Update the plan
                            plan.learningOptions = plan.learningOptions || {};
                            plan.learningOptions.video = plan.learningOptions.video || {};
                            plan.learningOptions.video.links = videoLinks;

                            await plan.save();

                            console.log(`    ✓ Added ${videoLinks.length} videos`);
                            totalUpdated++;
                        } else {
                            console.log(`    ⚠ No videos found, keeping existing data`);
                            totalSkipped++;
                        }

                        // Small delay to avoid rate limiting
                        await delay(500);

                    } catch (error) {
                        console.error(`    ✗ Error processing Day ${plan.day}:`, error.message);
                        totalErrors++;
                    }
                }

                console.log(`\n${roadmapId} Summary:`);
                console.log(`  Updated: ${totalUpdated}`);
                console.log(`  Skipped: ${totalSkipped}`);
                console.log(`  Errors: ${totalErrors}`);

            } catch (error) {
                console.error(`Error processing roadmap ${roadmapId}:`, error.message);
                totalErrors++;
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('FINAL SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Updated: ${totalUpdated}`);
        console.log(`Total Skipped: ${totalSkipped}`);
        console.log(`Total Errors: ${totalErrors}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
console.log('YouTube Video Population Script');
console.log('================================\n');

if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in environment variables');
    process.exit(1);
}

if (!process.env.YOUTUBE_API_KEY) {
    console.warn('WARNING: YOUTUBE_API_KEY not found - will use curated fallback videos');
}

populateVideoLinks()
    .then(() => {
        console.log('\n✓ Script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n✗ Script failed:', error);
        process.exit(1);
    });
