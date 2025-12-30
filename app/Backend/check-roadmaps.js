require('dotenv').config();
const mongoose = require('mongoose');
const Roadmap = require('./models/Roadmap');

async function checkRoadmaps() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const roadmaps = await Roadmap.find({}).select('roadmapId title description category');
        console.log(`\nFound ${roadmaps.length} roadmaps:\n`);

        roadmaps.forEach((roadmap, index) => {
            console.log(`${index + 1}. Title: ${roadmap.title || 'undefined'}`);
            console.log(`   RoadmapId: ${roadmap.roadmapId || 'undefined'}`);
            console.log(`   Category: ${roadmap.category || 'undefined'}`);
            console.log(`   _id: ${roadmap._id}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkRoadmaps();
