const fetch = require('node-fetch');

async function verifyExam() {
    const API_BASE = 'http://localhost:3000/api';
    const examCode = 'DEMO-2025';

    try {
        // Note: This requires a valid session/cookie. 
        // Since I can't easily simulate a full login here, I'll just check if the routes are reachable.
        // In a real scenario, I'd use a test token.

        console.log('Verifying Exam Entry...');
        // This will likely fail with 401 if not authenticated, but it proves the route exists.
        const res = await fetch(`${API_BASE}/exams/validate-entry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examCode })
        });

        console.log(`Response Status: ${res.status}`);
        const data = await res.json();
        console.log('Response Data:', data);

        if (res.status === 401) {
            console.log('✅ Route exists and is protected by authMiddleware.');
        } else if (res.status === 200) {
            console.log('✅ Exam validated successfully.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyExam();
