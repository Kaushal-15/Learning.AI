const mongoose = require('mongoose');
const Roadmap = require('./models/Roadmap');
const UserProgress = require('./models/UserProgress');
const User = require('./models/User');
const request = require('supertest');
const app = require('./server'); // Assuming server.js exports app

require('dotenv').config();

async function verifyProjects() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check if roadmaps have projects
        const roadmap = await Roadmap.findOne({ roadmapId: 'full-stack-development' });
        if (!roadmap) {
            console.error('❌ Roadmap not found');
            return;
        }

        if (roadmap.projects && roadmap.projects.length > 0) {
            console.log(`✅ Roadmap has ${roadmap.projects.length} projects`);
            console.log('Sample Project:', roadmap.projects[0]);
        } else {
            console.error('❌ Roadmap has no projects');
        }

        // 2. Simulate API call (requires auth, so we might just check DB logic directly for now)
        // Let's check if we can find a user and simulate submission
        const user = await User.findOne({ email: 'sample@gmail.com' });
        if (!user) {
            console.error('❌ Test user not found');
            return;
        }

        console.log(`Testing with user: ${user.email} (${user._id})`);

        let progress = await UserProgress.findOne({ userId: user._id, roadmapId: 'full-stack-development' });
        if (!progress) {
            progress = new UserProgress({
                userId: user._id,
                roadmapId: 'full-stack-development',
                completedTopics: [],
                completedPlans: [],
                completedQuestions: [],
                submittedProjects: []
            });
        }

        const projectId = roadmap.projects[0].id;
        const submissionUrl = 'https://github.com/test/project';

        const isNew = progress.submitProject(projectId, submissionUrl);
        await progress.save();

        console.log(`✅ Project submission result: ${isNew ? 'New Submission' : 'Updated Submission'}`);

        const updatedProgress = await UserProgress.findOne({ userId: user._id, roadmapId: 'full-stack-development' });
        const submission = updatedProgress.submittedProjects.find(p => p.projectId === projectId);

        if (submission && submission.submissionUrl === submissionUrl) {
            console.log('✅ Submission verified in DB');
        } else {
            console.error('❌ Submission not found in DB');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyProjects();
