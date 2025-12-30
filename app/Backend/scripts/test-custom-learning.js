const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
let accessToken = '';

// Login helper
async function login() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'kaushalshanmugam15@gmail.com',
            password: 'Kaushal@07'
        });

        // Extract access token from cookies
        const cookies = response.headers['set-cookie'];
        if (cookies) {
            const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
            if (accessTokenCookie) {
                accessToken = accessTokenCookie.split(';')[0].split('=')[1];
                console.log('✅ Login successful (Token extracted)');
            } else {
                console.error('❌ Login failed: Access token cookie not found');
                process.exit(1);
            }
        } else {
            console.error('❌ Login failed: No cookies received');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Create dummy file
function createDummyFile() {
    const content = `
    Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by humans or animals. 
    Leading AI textbooks define the field as the study of "intelligent agents": any system that perceives its environment and takes actions that maximize its chance of achieving its goals.
    Some popular accounts use the term "artificial intelligence" to describe machines that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving".
    
    Machine learning (ML) is a field of inquiry devoted to understanding and building methods that 'learn', that is, methods that leverage data to improve performance on some set of tasks.
    It is seen as a part of artificial intelligence. Machine learning algorithms build a model based on sample data, known as "training data", in order to make predictions or decisions without being explicitly programmed to do so.
    
    Deep learning is part of a broader family of machine learning methods based on artificial neural networks with representation learning.
    Learning can be supervised, semi-supervised or unsupervised.
  `;
    fs.writeFileSync('test-doc.txt', content);
    return 'test-doc.txt';
}

// Test Upload
async function testUpload() {
    try {
        const filePath = createDummyFile();
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const response = await axios.post(`${API_URL}/custom-learning/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('✅ Upload successful:', response.data);
        return response.data.documentId;
    } catch (error) {
        console.error('❌ Upload failed:', error.response?.data || error.message);
        return null;
    }
}

// Test Quiz Generation
async function testQuizGeneration(documentId) {
    try {
        const response = await axios.post(`${API_URL}/custom-learning/generate-quiz`, {
            documentId,
            mode: 'static',
            difficulty: 'medium',
            questionCount: 3
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('✅ Quiz generation successful:', response.data);
    } catch (error) {
        console.error('❌ Quiz generation failed:', error.response?.data || error.message);
    }
}

async function run() {
    await login();
    const documentId = await testUpload();
    if (documentId) {
        await testQuizGeneration(documentId);
    }

    // Clean up
    if (fs.existsSync('test-doc.txt')) {
        fs.unlinkSync('test-doc.txt');
    }
}

run();
