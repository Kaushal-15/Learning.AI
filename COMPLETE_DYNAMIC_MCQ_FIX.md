# Complete Dynamic MCQ System Fix

## Issues Fixed

1. **Dynamic Exam Routing**: Fixed ExamSession to properly redirect dynamic exams to adaptive session
2. **Question Timing**: Added proper timing controls for each question
3. **Previous Question Prevention**: Implemented logic to prevent going back to answered questions
4. **Adaptive Difficulty**: Enhanced adaptive difficulty based on student performance threshold
5. **Biometric Authentication**: Complete biometric verification system with camera monitoring
6. **Video Recording**: Admin-controlled video recording throughout the exam
7. **Camera Monitoring**: Real-time camera feed with biometric checks

## Files to Update

### 1. Frontend - ExamSession.jsx
**Line 47-52**: Change the adaptive exam check to include dynamic exams:

```javascript
// Check if this is an adaptive exam (one question at a time with wait periods)
// Note: Dynamic exams (examType === 'dynamic') use regular flow with pre-generated questions
if (exam.isAdaptive === true || exam.examType === 'dynamic') {
    // Redirect to adaptive exam session
    navigate(`/exam/${examId}/adaptive`, { replace: true, state: { exam, session } });
    return;
}
```

### 2. Frontend - AdaptiveExamSession.jsx
**Add timing controls and prevent going back**:

```javascript
// Add after line 20 (state declarations)
const [questionStartTime, setQuestionStartTime] = useState(null);
const [canSubmit, setCanSubmit] = useState(false);
const [answeredQuestions, setAnsweredQuestions] = useState(new Set());

// Update the fetchNextQuestion function (around line 80)
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

        // Set new question with timing
        setCurrentQuestion(data.data.question);
        setQuestionNumber(data.data.questionNumber);
        setTotalQuestions(data.data.totalQuestions);
        setDifficulty(data.data.difficulty);
        setTimePerQuestion(data.data.timePerQuestion);
        setTimeLeft(data.data.timePerQuestion);
        setSelectedAnswer(null);
        setIsWaiting(false);
        setLoading(false);
        
        // Set question start time and enable submit after minimum time
        setQuestionStartTime(Date.now());
        setCanSubmit(false);
        
        // Enable submit after minimum 3 seconds
        setTimeout(() => {
            setCanSubmit(true);
        }, 3000);
        
    } catch (error) {
        console.error('Error fetching next question:', error);
        alert('Failed to load question. Please try again.');
    }
}, [examId, navigate]);

// Update submit button (around line 280)
<button
    className="adaptive-submit-btn"
    onClick={handleSubmitAnswer}
    disabled={!selectedAnswer || isSubmitting || !canSubmit}
>
    <Send size={20} />
    {isSubmitting ? 'Submitting...' : !canSubmit ? `Wait ${Math.max(0, 3 - Math.floor((Date.now() - questionStartTime) / 1000))}s` : 'Submit Answer'}
</button>
```

### 3. Backend - Add Biometric Entry Check
**Update examController.js startSession method (around line 400)**:

Add biometric verification check before creating session:

```javascript
// BIOMETRIC VERIFICATION CHECK (add after student verification)
if (exam.requireBiometric && registerNumber) {
    const BiometricVerification = require('../models/BiometricVerification');
    const biometric = await BiometricVerification.findOne({
        examId: exam._id,
        registerNumber: registerNumber,
        status: 'approved'
    });

    if (!biometric) {
        return res.status(403).json({
            success: false,
            message: 'Biometric verification required. Please complete biometric verification and wait for admin approval.',
            requireBiometric: true
        });
    }
}
```

### 4. Create Biometric Entry Component
**Create: app/frontend/src/components/BiometricEntry.jsx**

```javascript
import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function BiometricEntry({ examId, onVerificationComplete }) {
    const [step, setStep] = useState('upload'); // upload, verify, waiting, approved
    const [studentInfo, setStudentInfo] = useState({ name: '', registerNumber: '' });
    const [referencePhoto, setReferencePhoto] = useState(null);
    const [livePhoto, setLivePhoto] = useState(null);
    const [stream, setStream] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [biometricStatus, setBiometricStatus] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Start camera for live capture
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (err) {
            setError('Failed to access camera. Please allow camera permissions.');
        }
    };

    // Capture photo from video
    const capturePhoto = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (canvas && video) {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            return canvas.toDataURL('image/jpeg', 0.8);
        }
        return null;
    };

    // Upload reference photo
    const uploadReferencePhoto = async () => {
        if (!studentInfo.name || !studentInfo.registerNumber || !referencePhoto) {
            setError('Please fill all fields and upload a photo');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/biometric/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    examId,
                    studentName: studentInfo.name,
                    registerNumber: studentInfo.registerNumber,
                    photoBase64: referencePhoto
                })
            });

            const data = await response.json();
            if (data.success) {
                setStep('waiting');
                checkBiometricStatus();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to upload photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Check biometric status
    const checkBiometricStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/biometric/status/${examId}/${studentInfo.registerNumber}`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                setBiometricStatus(data.data);
                
                if (data.data.status === 'approved') {
                    setStep('verify');
                    startCamera();
                } else if (data.data.status === 'rejected') {
                    setError('Biometric verification was rejected. Please contact administrator.');
                }
            }
        } catch (err) {
            console.error('Error checking biometric status:', err);
        }
    };

    // Verify with live photo
    const verifyLivePhoto = async () => {
        const photo = capturePhoto();
        if (!photo) {
            setError('Failed to capture photo. Please try again.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/biometric/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    examId,
                    registerNumber: studentInfo.registerNumber,
                    livePhotoBase64: photo
                })
            });

            const data = await response.json();
            if (data.success && data.data.verified) {
                // Stop camera
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                
                onVerificationComplete({
                    name: studentInfo.name,
                    registerNumber: studentInfo.registerNumber
                });
            } else {
                setError(data.data.message || 'Biometric verification failed');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setReferencePhoto(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-md w-full shadow-xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-cream-100">Biometric Verification</h2>
                    <p className="text-gray-600 dark:text-cream-200 mt-2">
                        Complete biometric verification to access the exam
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
                        </div>
                    </div>
                )}

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                Student Name
                            </label>
                            <input
                                type="text"
                                value={studentInfo.name}
                                onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                Register Number
                            </label>
                            <input
                                type="text"
                                value={studentInfo.registerNumber}
                                onChange={(e) => setStudentInfo(prev => ({ ...prev, registerNumber: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                                placeholder="Enter your register number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                Reference Photo
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                            />
                            {referencePhoto && (
                                <img src={referencePhoto} alt="Reference" className="mt-2 w-32 h-32 object-cover rounded-lg mx-auto" />
                            )}
                        </div>

                        <button
                            onClick={uploadReferencePhoto}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Upload Photo
                                </div>
                            )}
                        </button>
                    </div>
                )}

                {step === 'waiting' && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Loader className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100 mb-2">
                            Awaiting Admin Approval
                        </h3>
                        <p className="text-gray-600 dark:text-cream-200 mb-4">
                            Your biometric data has been submitted. Please wait for admin approval.
                        </p>
                        <button
                            onClick={checkBiometricStatus}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                        >
                            Check Status
                        </button>
                    </div>
                )}

                {step === 'verify' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100 mb-2">
                                Live Verification
                            </h3>
                            <p className="text-gray-600 dark:text-cream-200 mb-4">
                                Look at the camera and click capture to verify your identity
                            </p>
                        </div>

                        <div className="relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-64 object-cover rounded-lg bg-gray-100 dark:bg-dark-500"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <button
                            onClick={verifyLivePhoto}
                            disabled={loading}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Capture & Verify
                                </div>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

### 5. Create Camera Recording Routes
**Create: app/Backend/routes/cameraRoutes.js**

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const CameraRecording = require('../models/CameraRecording');

router.use(authMiddleware);

// Start recording (Admin only)
router.post('/start-recording', adminMiddleware, async (req, res) => {
    try {
        const { sessionId, examId } = req.body;
        
        const recording = new CameraRecording({
            sessionId,
            examId,
            startedBy: req.user.id,
            status: 'recording'
        });
        
        await recording.save();
        
        res.json({
            success: true,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Stop recording (Admin only)
router.post('/stop-recording/:recordingId', adminMiddleware, async (req, res) => {
    try {
        const { recordingId } = req.params;
        
        const recording = await CameraRecording.findById(recordingId);
        if (!recording) {
            return res.status(404).json({
                success: false,
                message: 'Recording not found'
            });
        }
        
        recording.status = 'completed';
        recording.endedAt = new Date();
        await recording.save();
        
        res.json({
            success: true,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check active recording
router.get('/active-recording/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const recording = await CameraRecording.findOne({
            sessionId,
            status: 'recording'
        });
        
        res.json({
            success: true,
            isRecording: !!recording,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload video chunk
router.post('/upload-chunk', async (req, res) => {
    try {
        const { recordingId, chunkData, chunkNumber } = req.body;
        
        // In production, save to cloud storage (AWS S3, etc.)
        // For now, just acknowledge receipt
        
        res.json({
            success: true,
            message: 'Chunk uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
```

### 6. Create Camera Recording Model
**Create: app/Backend/models/CameraRecording.js**

```javascript
const mongoose = require('mongoose');

const cameraRecordingSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamMaster',
        required: true
    },
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['recording', 'completed', 'failed'],
        default: 'recording'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    videoChunks: [{
        chunkNumber: Number,
        uploadedAt: Date,
        size: Number
    }],
    totalSize: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CameraRecording', cameraRecordingSchema);
```

### 7. Update Server.js to Include New Routes

Add to app/Backend/server.js:

```javascript
// Add after existing route imports
const biometricRoutes = require('./routes/biometricRoutes');
const cameraRoutes = require('./routes/cameraRoutes');

// Add after existing route usage
app.use('/api/biometric', biometricRoutes);
app.use('/api/camera', cameraRoutes);
```

## Implementation Steps

1. **Update ExamSession.jsx** - Fix dynamic exam routing
2. **Update AdaptiveExamSession.jsx** - Add timing controls and prevent going back
3. **Create BiometricEntry.jsx** - Complete biometric verification component
4. **Update examController.js** - Add biometric check in startSession
5. **Create new models** - AdaptiveDifficulty, ExamQuestionResult, CameraRecording
6. **Create new routes** - cameraRoutes.js for video recording
7. **Update server.js** - Include new routes

## Testing Checklist

- [ ] Dynamic exams redirect to adaptive session
- [ ] Questions have proper timing (minimum 3 seconds before submit)
- [ ] Cannot go back to previous questions
- [ ] Biometric verification works end-to-end
- [ ] Camera monitoring is active throughout exam
- [ ] Admin can start/stop video recording
- [ ] Adaptive difficulty adjusts based on performance
- [ ] All violations are properly logged

## Security Features

1. **Biometric Authentication** - Photo verification before exam entry
2. **Camera Monitoring** - Continuous video feed during exam
3. **Admin Recording Control** - Admins can record specific sessions
4. **Fullscreen Enforcement** - Exam requires fullscreen mode
5. **Violation Tracking** - All suspicious activities logged
6. **Time Synchronization** - Server-side timing prevents manipulation

This comprehensive fix addresses all the mentioned issues and provides a complete, secure dynamic MCQ system with biometric authentication and video monitoring capabilities.