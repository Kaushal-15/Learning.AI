require('dotenv').config();
const mongoose = require('mongoose');

const DailyLearningPlanSchema = new mongoose.Schema({}, { strict: false });
const DailyLearningPlan = mongoose.model('DailyLearningPlan', DailyLearningPlanSchema);

async function checkCounts() {
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

        console.log('📊 Checking Plan Counts per Roadmap:');
        console.log('----------------------------------------');

        let totalMissing = 0;

        for (const roadmapId of roadmaps) {
            const count = await DailyLearningPlan.countDocuments({ roadmapId });
            const status = count === 30 ? '✅' : '❌';
            console.log(`${status} ${roadmapId}: ${count}/30`);

            if (count < 30) {
                // Find which days are missing
                const existingPlans = await DailyLearningPlan.find({ roadmapId }, { day: 1 }).sort({ day: 1 });
                const existingDays = existingPlans.map(p => p.day);
                const missingDays = [];
                for (let i = 1; i <= 30; i++) {
                    if (!existingDays.includes(i)) missingDays.push(i);
                }
                console.log(`   Missing Days: ${missingDays.join(', ')}`);
                totalMissing += missingDays.length;
            }
        }
        console.log('----------------------------------------');

        if (totalMissing === 0) {
            console.log('🎉 All roadmaps have complete 30-day plans!');
        } else {
            console.log(`⚠️ Found ${totalMissing} missing plans.`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkCounts();
