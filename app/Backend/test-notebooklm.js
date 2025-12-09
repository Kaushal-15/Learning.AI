require('dotenv').config();
const contentGenerator = require('./services/contentGenerator');

async function testGeneration() {
    console.log('Testing NotebookLM Content Generation...');

    const baseParams = {
        roadmap: 'full-stack-development',
        day: 1,
        topic: 'Introduction',
        subtopic: 'Web Basics'
    };

    try {
        // 1. Test Audio
        console.log('\n--- Testing Audio Generation ---');
        const audio = await contentGenerator.generate({ ...baseParams, content_type: 'audio' });
        console.log('Audio Result:', JSON.stringify(audio, null, 2));
        if (audio.dialogue && Array.isArray(audio.dialogue)) {
            console.log('✅ Audio structure valid');
        } else {
            console.error('❌ Audio structure invalid');
        }

        // 2. Test Mindmap
        console.log('\n--- Testing Mindmap Generation ---');
        const mindmap = await contentGenerator.generate({ ...baseParams, content_type: 'image' });
        console.log('Mindmap Result:', JSON.stringify(mindmap, null, 2));
        if (mindmap.mermaid && mindmap.mermaid.includes('graph')) {
            console.log('✅ Mindmap structure valid');
        } else {
            console.error('❌ Mindmap structure invalid');
        }

        // 3. Test Video
        console.log('\n--- Testing Video Generation ---');
        const video = await contentGenerator.generate({ ...baseParams, content_type: 'video' });
        console.log('Video Result:', JSON.stringify(video, null, 2));
        if (video.links && video.links[0].url.includes('embed')) {
            console.log('✅ Video structure valid');
        } else {
            console.error('❌ Video structure invalid');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testGeneration();
