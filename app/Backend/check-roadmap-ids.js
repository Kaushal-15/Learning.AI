require('dotenv').config();
const mongoose = require('mongoose');

async function checkRoadmapIds() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const db = mongoose.connection.db;

        // Check DailyLearningPlan collection for actual roadmap IDs
        const roadmapIds = await db.collection('dailylearningplans')
            .distinct('roadmapId');

        console.log('\nRoadmap IDs found in DailyLearningPlan collection:');
        roadmapIds.forEach((id, index) => {
            console.log(`${index + 1}. ${id}`);
        });

        // Check Roadmap collection
        console.log('\n\nChecking Roadmap collection...');
        const roadmaps = await db.collection('roadmaps').find({}).toArray();
        console.log(`Found ${roadmaps.length} roadmaps`);

        roadmaps.forEach((roadmap, index) => {
            console.log(`\n${index + 1}.`);
            console.log(`   _id: ${roadmap._id}`);
            console.log(`   roadmapId: ${roadmap.roadmapId}`);
            console.log(`   title: ${roadmap.title}`);
            console.log(`   category: ${roadmap.category}`);
            console.log(`   projects: ${roadmap.projects ? roadmap.projects.length : 0} projects`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkRoadmapIds();
