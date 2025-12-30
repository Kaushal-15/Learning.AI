require('dotenv').config();
const mongoose = require('mongoose');

async function verifyAIPlan() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const collection = mongoose.connection.db.collection('dailylearningplans');
        const plan = await collection.findOne({ roadmapId: 'ai-machine-learning', day: 1 });

        if (!plan) {
            console.log('❌ AI Plan Day 1 not found!');
        } else {
            console.log('✅ Found AI Plan Day 1');
            console.log('Topic:', plan.topic);
            console.log('Roadmap:', plan.roadmapId);
            console.log('Videos:', plan.learningOptions?.video?.links?.length || 0);
            if (plan.learningOptions?.video?.links?.length > 0) {
                console.log('First Video URL:', plan.learningOptions.video.links[0].url);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

verifyAIPlan();
