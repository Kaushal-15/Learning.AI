// Camera Proctoring Fix for AdaptiveExamSession.jsx
// Add these enhancements to enable camera proctoring

// Add to imports at the top
import CameraMonitor from './CameraMonitor';

// Add to state variables (after existing useState declarations)
const [cameraActive, setCameraActive] = useState(false);
const [proctoringEnabled, setProctoringEnabled] = useState(false);
const [violations, setViolations] = useState(0);
const [questionStartTime, setQuestionStartTime] = useState(null);
const [canSubmit, setCanSubmit] = useState(false);

// Enhanced fetchNextQuestion with timing controls
const fetchNextQuestion = useCallback(async () => {
    try {
        const res = await fetch(`${API_BASE}/exams/${examId}/adaptive/next-question`, {
            credentials: 'include'
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        if (data.isWaiting) {
            setIsWaiting(true);
            checkWaitStatus();
            return;
        }

        if (data.isComplete) {
            setExamComplete(true);
            setTimeout(() => {
                navigate(`/exam/${examId}/result`);
            }, 2000);
            return;
        }

        // Set new question with enhanced timing controls
        setCurrentQuestion(data.data.question);
        setQuestionNumber(data.data.questionNumber);
        setTotalQuestions(data.data.totalQuestions);
        setDifficulty(data.data.difficulty);
        setTimePerQuestion(data.data.timePerQuestion);
        setTimeLeft(data.data.timePerQuestion);
        setSelectedAnswer(null);
        setIsWaiting(false);
        setLoading(false);
        
        // Enhanced timing controls
        setQuestionStartTime(Date.now());
        setCanSubmit(false);
        
        // Enable submit after minimum 3 seconds
        setTimeout(() => {
            setCanSubmit(true);
        }, 3000);
        
        console.log('✅ Next question loaded with timing controls');
        
    } catch (error) {
        console.error('Error fetching next question:', error);
        alert('Failed to load question. Please try again.');
    }
}, [examId, navigate]);

// Enhanced handleSubmitAnswer with proper error handling
const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isSubmitting || !canSubmit) return;

    setIsSubmitting(true);
    try {
        const timeSpent = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;
        
        const res = await fetch(`${API_BASE}/exams/${examId}/adaptive/submit-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                questionId: currentQuestion._id,
                answer: selectedAnswer,
                timeSpent: timeSpent
            })
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to submit answer');
        }

        console.log('✅ Answer submitted successfully:', data.isCorrect ? 'CORRECT' : 'INCORRECT');

        // Start wait period
        setIsWaiting(true);
        setWaitTime(data.waitTime);
        setIndividualStats(data.individualStats);

    } catch (error) {
        console.error('Error submitting answer:', error);
        alert(`Failed to submit answer: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
};

// Camera initialization effect
useEffect(() => {
    const initializeCamera = async () => {
        if (exam && !loading) {
            setProctoringEnabled(true);
            setCameraRequired(true);
            
            // Log session start
            try {
                await fetch(`${API_BASE}/exams/${examId}/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        eventType: 'session_start',
                        details: 'Adaptive exam session started with camera proctoring'
                    })
                });
            } catch (err) {
                console.warn('Failed to log session start:', err);
            }
        }
    };

    initializeCamera();
}, [exam, loading, examId]);

// Violation handler
const handleViolation = useCallback(async (violationType) => {
    try {
        const response = await fetch(`${API_BASE}/exams/${examId}/log-violation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                violationType,
                details: `Violation detected: ${violationType}`
            })
        });

        const data = await response.json();
        if (data.success) {
            setViolations(data.violationCount);
            
            if (data.autoSubmit) {
                alert('Exam terminated due to multiple violations.');
                navigate(`/exam/${examId}/result`);
            }
        }
    } catch (error) {
        console.error('Error logging violation:', error);
    }
}, [examId, navigate]);

// Camera status handler
const handleCameraStatus = useCallback((status) => {
    setCameraActive(status.active);
    
    if (!status.active && proctoringEnabled) {
        handleViolation('camera_disabled');
    }
}, [proctoringEnabled, handleViolation]);

// Enhanced submit button with timing controls
const renderSubmitButton = () => {
    const timeUntilSubmit = canSubmit ? 0 : Math.max(0, 3 - Math.floor((Date.now() - questionStartTime) / 1000));
    
    return (
        <button
            className={`adaptive-submit-btn ${!selectedAnswer || isSubmitting || !canSubmit ? 'disabled' : ''}`}
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || isSubmitting || !canSubmit}
        >
            <Send size={20} />
            {isSubmitting ? 'Submitting...' : 
             !canSubmit ? `Wait ${timeUntilSubmit}s` : 
             'Submit Answer'}
        </button>
    );
};

// Add to the JSX return (before closing div)
{/* Camera Monitor */}
{sessionId && cameraRequired && (
    <CameraMonitor
        sessionId={sessionId}
        examId={examId}
        isRequired={cameraRequired}
        onCameraStatus={handleCameraStatus}
    />
)}

{/* Violation Warning */}
{violations > 0 && (
    <div className="violation-warning">
        <AlertTriangle size={16} />
        <span>Violations: {violations}/3</span>
    </div>
)}

// CSS for violation warning
const violationWarningStyle = `
.violation-warning {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    z-index: 1000;
    animation: pulse 2s infinite;
}

.adaptive-submit-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
`;

// Add style tag to head
useEffect(() => {
    const style = document.createElement('style');
    style.textContent = violationWarningStyle;
    document.head.appendChild(style);
    
    return () => {
        document.head.removeChild(style);
    };
}, []);

export default AdaptiveExamSession;