require('dotenv').config();
const mongoose = require('mongoose');

async function fixRoadmaps() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const collection = mongoose.connection.db.collection('dailylearningplans');

        // Fetch all plans sorted by creation time or just by _id if they were inserted in order
        // The previous inspection showed they are in order of insertion/retrieval
        const plans = await collection.find({ roadmapId: 'full-stack-development' }).toArray();

        if (plans.length !== 240) {
            console.log(`⚠️ Expected 240 plans, found ${plans.length}. Aborting to avoid data corruption.`);
            process.exit(1);
        }

        const roadmaps = [
            'full-stack-development', // 0-29
            'frontend-development',   // 30-59
            'backend-development',    // 60-89
            'mobile-app-development', // 90-119
            'database-data-science',  // 120-149
            'cybersecurity',          // 150-179
            'devops-cloud',           // 180-209
            'ai-machine-learning'     // 210-239
        ];

        let updated = 0;

        for (let i = 0; i < plans.length; i++) {
            const chunkIndex = Math.floor(i / 30);
            const correctRoadmapId = roadmaps[chunkIndex];
            const plan = plans[i];

            if (plan.roadmapId !== correctRoadmapId) {
                await collection.updateOne(
                    { _id: plan._id },
                    { $set: { roadmapId: correctRoadmapId } }
                );
                updated++;
            }
        }

        console.log(`✅ Successfully reassigned ${updated} plans.`);

        // Verify counts
        console.log('\n📊 Verifying Counts:');
        for (const rid of roadmaps) {
            const count = await collection.countDocuments({ roadmapId: rid });
            console.log(`  ${rid}: ${count}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

fixRoadmaps();
