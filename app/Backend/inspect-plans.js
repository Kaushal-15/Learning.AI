require('dotenv').config();
const mongoose = require('mongoose');

async function inspectPlans() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const collection = mongoose.connection.db.collection('dailylearningplans');
        const plans = await collection.find({ roadmapId: 'full-stack-development' }).toArray();

        console.log(`Found ${plans.length} plans under 'full-stack-development'`);

        // Group by potential roadmap based on topic keywords or just list them
        // Since there are 240, let's list the first 5 of each 30-day chunk if they are ordered

        // Assuming they might be inserted in order
        for (let i = 0; i < plans.length; i += 30) {
            console.log(`\nChunk ${i / 30 + 1} (Indices ${i}-${i + 29}):`);
            const chunk = plans.slice(i, i + 5);
            chunk.forEach(p => console.log(`  Day ${p.day}: ${p.topic}`));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

inspectPlans();
