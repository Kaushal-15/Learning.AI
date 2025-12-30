require('dotenv').config();
const mongoose = require('mongoose');

async function removeDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const roadmaps = [
            'full-stack-development',
            'frontend-development',
            'backend-development',
            'mobile-app-development',
            'database-data-science',
            'cybersecurity',
            'devops-cloud',
            'ai-machine-learning'
        ];

        let totalRemoved = 0;

        for (const roadmapId of roadmaps) {
            console.log(`Checking ${roadmapId}...`);
            const plans = await mongoose.connection.db.collection('dailylearningplans')
                .find({ roadmapId })
                .sort({ day: 1, createdAt: -1 }) // Newest first
                .toArray();

            const dayMap = new Map();
            const duplicates = [];

            for (const plan of plans) {
                if (dayMap.has(plan.day)) {
                    duplicates.push(plan._id);
                } else {
                    dayMap.set(plan.day, plan._id);
                }
            }

            if (duplicates.length > 0) {
                console.log(`  🗑️ Removing ${duplicates.length} duplicates...`);
                await mongoose.connection.db.collection('dailylearningplans')
                    .deleteMany({ _id: { $in: duplicates } });
                totalRemoved += duplicates.length;
            }
        }

        console.log(`\n🎉 Removed ${totalRemoved} duplicates!`);

        // Final Count Verification
        console.log('\n📊 Final Counts:');
        for (const rid of roadmaps) {
            const count = await mongoose.connection.db.collection('dailylearningplans').countDocuments({ roadmapId: rid });
            console.log(`  ${rid}: ${count}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

removeDuplicates();
