require('dotenv').config();
const mongoose = require('mongoose');

// Real working YouTube video IDs (reused)
const VIDEOS = {
    HTML: ['UB1O30fR-EE', 'qz0aGYrrlhU', 'pQN-pnXPaVg', 'kUMe1FH4CHE', 'salY_Sm6mv4'],
    CSS: ['1PnVor36_40', 'yfoY53QXEnI', 'Tfjd5yzCaxk', 'ieTHC78giGQ', 'OXGznpKZ_sA'],
    JavaScript: ['W6NZfCO5SIk', 'PkZNo7MFNFg', 'hdI2bqOjy3c', 'jS4aFq5-91M', 'Qqx_wzMmFeA'],
    React: ['Ke90Tje7VS0', 'w7ejDZ8SWv8', 'SqcY0GlETPk', 'Dorf8i6lCuk', 'hQAHSlTtcmY'],
    Node: ['TlB_eWDSMt4', 'fBNz5xF-Kx4', 'f2EqECiTBL8', 'Oe421EPjeBE', 'zb3Qk8SG5Ms'],
    Database: ['HXV3zeQKqGY', 'ztHopE5Wnpc', '7S_tz1z_5bA', 'qw--VYLpxG4', 'FR4QIeZaPeM'],
    Python: ['rfscVS0vtbw', 'kqtD5dpn9C8', '_uQrJ0TkZlc', 'eWRfhZUzrAc', 'sxTmJE4k0ho'],
    API: ['GZvSYJDk-us', 'WXsD0ZgxjRW', 'FLnxgSZ0DG4', 'PfRFQNkjRNI', 'ByGJQzlzxQg'],
    Git: ['RGOj5yH7evk', 'USjZcfj8yxE', 'HVsySz-h9r4', 'SWYqp7iY_Tc', 'tRZGeaHPoaw'],
    Docker: ['fqMOX6JJhGo', 'pg19Z8LL06w', 'Gjnup-PuquQ', '3c-iBn73dDE', 'pTFZFxd4hOI'],
    AWS: ['ulprqHHWlng', 'SOTamWNgDKc', 'JIbIYCM48to', 'k1RI5locZE4', 'ubCNZRNjhyo'],
    Security: ['sdpxddDzXfE', 'ooJSgsB5fIE', 'hxJOF2JhJvI', 'inWWhr5tnEA', 'Kv12hfmJWEQ'],
    ML: ['aircAruvnKk', 'i_LwzRVP7bg', 'GwIo3gDZCVQ', 'tPYj3fFJGjk', 'zcMnu-3wkWo'],
    Mobile: ['0-S5a0eXPoc', 'VPvVD8t02U8', 'x0uinJvhNxI', 'fmPmrJGbb6w', 'qjA0JkYi8WI'],
    DevOps: ['Xrgk023l4lI', 'j5Zsa_eOXeY', 'scEDHsr3APg', 'hQcFE0RD0cQ', 'kBp6bso5ep4']
};

function getVideos(topic) {
    const t = topic.toLowerCase();
    let ids = VIDEOS.JavaScript;
    if (t.includes('html')) ids = VIDEOS.HTML;
    else if (t.includes('css')) ids = VIDEOS.CSS;
    else if (t.includes('javascript') || t.includes('js')) ids = VIDEOS.JavaScript;
    else if (t.includes('react')) ids = VIDEOS.React;
    else if (t.includes('node')) ids = VIDEOS.Node;
    else if (t.includes('database') || t.includes('sql') || t.includes('mongo')) ids = VIDEOS.Database;
    else if (t.includes('python')) ids = VIDEOS.Python;
    else if (t.includes('api') || t.includes('rest')) ids = VIDEOS.API;
    else if (t.includes('git')) ids = VIDEOS.Git;
    else if (t.includes('docker')) ids = VIDEOS.Docker;
    else if (t.includes('aws') || t.includes('cloud')) ids = VIDEOS.AWS;
    else if (t.includes('security') || t.includes('cyber')) ids = VIDEOS.Security;
    else if (t.includes('machine') || t.includes('ml') || t.includes('ai')) ids = VIDEOS.ML;
    else if (t.includes('mobile') || t.includes('flutter')) ids = VIDEOS.Mobile;
    else if (t.includes('devops')) ids = VIDEOS.DevOps;

    return ids.map((id, i) => ({
        url: `https://www.youtube.com/embed/${id}`,
        title: `${topic} - Tutorial ${i + 1}`,
        description: `Learn ${topic} with this video tutorial`,
        duration: '10-30 min'
    }));
}

const DailyLearningPlanSchema = new mongoose.Schema({
    roadmapId: String,
    week: Number,
    day: Number,
    topic: String,
    difficultyLevel: String,
    learningGoals: [String],
    learningOptions: {
        text: mongoose.Schema.Types.Mixed,
        video: {
            links: [{
                url: String,
                title: String,
                description: String,
                duration: String
            }]
        },
        audio: mongoose.Schema.Types.Mixed,
        images: mongoose.Schema.Types.Mixed
    },
    miniRecap: String,
    practiceSuggestions: [String],
    optionalChallenge: String
}, { timestamps: true, strict: false });

const DailyLearningPlan = mongoose.model('DailyLearningPlan', DailyLearningPlanSchema);

async function fillMissingDays() {
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

        for (const roadmapId of roadmaps) {
            console.log(`Checking ${roadmapId}...`);
            const plans = await DailyLearningPlan.find({ roadmapId }).sort({ day: 1 });
            const existingDays = new Set(plans.map(p => p.day));

            for (let day = 1; day <= 30; day++) {
                if (!existingDays.has(day)) {
                    console.log(`  ➕ Creating missing Day ${day}`);

                    // Determine topic based on roadmap and day
                    let topic = `${roadmapId.replace(/-/g, ' ')} Day ${day}`;
                    if (day === 1) topic = 'Introduction & Basics';
                    else if (day === 30) topic = 'Final Project & Review';

                    const videos = getVideos(roadmapId); // Use roadmap name for video search if topic is generic

                    await DailyLearningPlan.create({
                        roadmapId,
                        day,
                        week: Math.ceil(day / 7),
                        topic,
                        difficultyLevel: 'Beginner',
                        learningGoals: [`Learn about ${topic}`],
                        learningOptions: {
                            video: { links: videos },
                            text: { content: `Content for ${topic}` }
                        },
                        miniRecap: `Recap of ${topic}`,
                        practiceSuggestions: ['Practice the concepts'],
                        optionalChallenge: 'Build a small demo'
                    });
                }
            }
        }

        console.log('\n🎉 All missing days filled!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

fillMissingDays();
