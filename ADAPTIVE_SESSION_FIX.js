// Fix for AdaptiveExamSession.jsx
// Add this method before fetchNextQuestion

const initializeSession = useCallback(async () => {
    try {
        // First, start the regular session to initialize the exam
        const sessionResponse = await fetch(`${API_BASE}/exams/${examId}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                studentName: 'Student', // This should come from props or state
                registerNumber: '' // This should come from props or state
            })
        });
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.success) {
            throw new Error(sessionData.message);
        }
        
        // Set exam info from session data
        setExam(sessionData.data.exam);
        setTotalQuestions(sessionData.data.exam.totalQuestions);
        
        // Now fetch the first adaptive question
        fetchNextQuestion();
        
    } catch (error) {
        console.error('Error initializing session:', error);
        alert('Failed to initialize exam session. Please try again.');
        navigate('/dashboard');
    }
}, [examId, navigate, fetchNextQuestion]);

// Replace the useEffect that calls fetchNextQuestion with:
useEffect(() => {
    initializeSession();
}, [initializeSession]);