const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const jar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: 'http://localhost:3000/api',
    jar,
    withCredentials: true
}));

async function testRoadmapFlow() {
    try {
        const timestamp = Date.now();
        const user = {
            name: `Test User ${timestamp}`,
            email: `test${timestamp}@example.com`,
            password: 'Password123!'
        };

        console.log('1. Registering user...');
        const registerRes = await client.post('/auth/register', user);
        console.log('✅ Registered:', registerRes.data.message);

        console.log('2. Logging in...');
        await client.post('/auth/login', {
            email: user.email,
            password: user.password
        });
        console.log('✅ Logged in');

        console.log('3. Selecting roadmap (Full-Stack)...');
        await client.post('/roadmap-selection/select', {
            selectedRoadmap: 'full-stack',
            skillLevel: 'beginner',
            learningTimeline: '3-months'
        });
        console.log('✅ Roadmap selected');

        console.log('4. Verifying profile (Dashboard check)...');
        const profileRes1 = await client.get('/profile/me');
        const roadmap1 = profileRes1.data.user.selectedRoadmap;
        console.log('Current Roadmap:', roadmap1);

        if (roadmap1 !== 'full-stack') {
            throw new Error(`Expected full-stack, got ${roadmap1}`);
        }
        console.log('✅ Profile reflects initial roadmap');

        console.log('5. Changing roadmap (Frontend)...');
        await client.post('/roadmap-selection/change', {
            newRoadmapId: 'frontend',
            skillLevel: 'intermediate',
            learningTimeline: '1-month'
        });
        console.log('✅ Roadmap changed');

        console.log('6. Verifying profile again...');
        const profileRes2 = await client.get('/profile/me');
        const roadmap2 = profileRes2.data.user.selectedRoadmap;
        console.log('Current Roadmap:', roadmap2);

        if (roadmap2 !== 'frontend') {
            throw new Error(`Expected frontend, got ${roadmap2}`);
        }
        console.log('✅ Profile reflects changed roadmap');

        console.log('🎉 ALL TESTS PASSED');

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testRoadmapFlow();
