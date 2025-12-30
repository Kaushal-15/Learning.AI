require('dotenv').config();
const mongoose = require('mongoose');

async function checkAIDays() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const collection = mongoose.connection.db.collection('dailylearningplans');
        const plans = await collection.find({ roadmapId: 'ai-machine-learning' }).sort({ day: 1 }).toArray();

        console.log(`Found ${plans.length} plans for AI.`);
        const days = plans.map(p => p.day);
        console.log('Days present:', days.join(', '));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkAIDays();
