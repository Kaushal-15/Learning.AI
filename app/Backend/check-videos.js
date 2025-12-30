require('dotenv').config();
const mongoose = require('mongoose');

const DailyLearningPlanSchema = new mongoose.Schema({}, { strict: false });
const DailyLearningPlan = mongoose.model('DailyLearningPlan', DailyLearningPlanSchema);

async function checkVideos() {
    await mongoose.connect(process.env.MONGODB_URI);

    const plan = await DailyLearningPlan.findOne({ day: 1 });

    console.log('\n📋 Checking Day 1 Videos:');
    console.log('Topic:', plan.topic);
    console.log('\n🎬 Video URLs:');

    if (plan.learningOptions?.video?.links) {
        plan.learningOptions.video.links.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.url}`);
            console.log(`     Title: ${v.title}`);
        });
    } else {
        console.log('  ❌ No videos found!');
    }

    await mongoose.connection.close();
}

checkVideos().catch(console.error);
