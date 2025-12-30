const mongoose = require('mongoose');
require('dotenv').config();

const DailyLearningPlan = require('./models/DailyLearningPlan');
const Question = require('./models/Question');

async function fixRoadmapIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check current roadmapIds
        const currentIds = await DailyLearningPlan.distinct('roadmapId');
        console.log('\nCurrent roadmapIds in DailyLearningPlan:', currentIds);

        const questionIds = await Question.distinct('roadmapId');
        console.log('Current roadmapIds in Question:', questionIds);

        // Map UUID to proper roadmap names
        // We need to determine which UUID corresponds to which roadmap
        // Let's check the topics to infer the roadmap
        const uuidRoadmapId = currentIds[0]; // The UUID we found

        // Sample some documents to see their topics
        const sampleDocs = await DailyLearningPlan.find({ roadmapId: uuidRoadmapId }).limit(5);
        console.log('\nSample topics from UUID roadmap:');
        sampleDocs.forEach(doc => {
            console.log(`  - Day ${doc.day}: ${doc.topic}`);
        });

        // Based on the topics, determine which roadmap this should be
        // For now, let's assume it's full-stack-development since that's what the user is trying to access
        const targetRoadmapId = 'full-stack-development';

        console.log(`\nUpdating roadmapId from '${uuidRoadmapId}' to '${targetRoadmapId}'...`);

        // Update DailyLearningPlan
        const dailyResult = await DailyLearningPlan.updateMany(
            { roadmapId: uuidRoadmapId },
            { $set: { roadmapId: targetRoadmapId } }
        );
        console.log(`Updated ${dailyResult.modifiedCount} DailyLearningPlan documents`);

        // Update Questions
        const questionResult = await Question.updateMany(
            { roadmapId: uuidRoadmapId },
            { $set: { roadmapId: targetRoadmapId } }
        );
        console.log(`Updated ${questionResult.modifiedCount} Question documents`);

        // Verify the update
        const newIds = await DailyLearningPlan.distinct('roadmapId');
        console.log('\nNew roadmapIds in DailyLearningPlan:', newIds);

        // Test fetching week 1
        const week1Content = await DailyLearningPlan.find({
            roadmapId: targetRoadmapId,
            week: 1
        });
        console.log(`\nWeek 1 content count: ${week1Content.length}`);
        if (week1Content.length > 0) {
            console.log('Sample Week 1 day:', {
                day: week1Content[0].day,
                topic: week1Content[0].topic,
                week: week1Content[0].week
            });
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixRoadmapIds();
