require('dotenv').config();
const mongoose = require('mongoose');

async function inspectDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const collection = mongoose.connection.db.collection('dailylearningplans');
        const plans = await collection.find({
            roadmapId: 'ai-machine-learning',
            day: { $in: [19, 22, 23] }
        }).toArray();

        console.log('Duplicate Days Inspection:');
        plans.forEach(p => {
            console.log(`Day ${p.day}: ${p.topic} (_id: ${p._id})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

inspectDuplicates();
