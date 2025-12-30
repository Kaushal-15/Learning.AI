require('dotenv').config();
const mongoose = require('mongoose');

async function testVideos() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const collection = mongoose.connection.db.collection('dailylearningplans');
        const plan = await collection.findOne({ day: 1 });

        console.log('📋 Day 1 Data:');
        console.log('Topic:', plan?.topic || 'NOT FOUND');
        console.log('\n🎬 Video Links:');

        if (plan?.learningOptions?.video?.links) {
            const links = plan.learningOptions.video.links;
            console.log(`Found ${links.length} videos:`);
            links.forEach((v, i) => {
                console.log(`\n  Video ${i + 1}:`);
                console.log(`    URL: ${v.url}`);
                console.log(`    Title: ${v.title}`);
            });
        } else {
            console.log('❌ NO VIDEOS FOUND IN DATABASE!');
            console.log('\nVideo object:', JSON.stringify(plan?.learningOptions?.video, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testVideos();
