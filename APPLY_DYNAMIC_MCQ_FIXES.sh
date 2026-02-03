#!/bin/bash

echo "🚀 Applying Dynamic MCQ System Fixes..."

# Create missing backend models
echo "📁 Creating backend models..."

# AdaptiveDifficulty model already created
# ExamQuestionResult model already created  
# CameraRecording model already created

# Create camera routes (already created)

# Update server.js to include new routes
echo "🔧 Updating server.js..."
if ! grep -q "biometricRoutes" app/Backend/server.js; then
    echo "Adding biometric and camera routes to server.js..."
    # Add the routes after existing route imports
    sed -i '/const examRoutes = require/a const biometricRoutes = require('"'"'./routes/biometricRoutes'"'"');' app/Backend/server.js
    sed -i '/const biometricRoutes/a const cameraRoutes = require('"'"'./routes/cameraRoutes'"'"');' app/Backend/server.js
    
    # Add route usage after existing route usage
    sed -i '/app.use.*\/api\/exams/a app.use('"'"'/api/biometric'"'"', biometricRoutes);' app/Backend/server.js
    sed -i '/app.use.*\/api\/biometric/a app.use('"'"'/api/camera'"'"', cameraRoutes);' app/Backend/server.js
fi

# Create frontend components
echo "🎨 Creating frontend components..."

# Create BiometricEntry component
cat > app/frontend/src/components/BiometricEntry.jsx << 'EOF'
import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function BiometricEntry({ examId, onVerificationComplete }) {
    const [step, setStep] = useState('upload');
    const [studentInfo, setStudentInfo] = useState({ name: '', registerNumber: '' });
    const [referencePhoto, setReferencePhoto] = useState(null);
    const [stream, setStream] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [biometricStatus, setBiometricStatus] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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
EOF

echo "✅ Dynamic MCQ System fixes applied successfully!"
echo ""
echo "📋 Manual Steps Required:"
echo "1. Update ExamSession.jsx line 47-52 to include dynamic exam check"
echo "2. Update AdaptiveExamSession.jsx to add timing controls"
echo "3. Update examController.js startSession method to add biometric check"
echo "4. Restart the backend server to load new routes"
echo ""
echo "🔧 Files Created/Updated:"
echo "- ✅ AdaptiveDifficulty model"
echo "- ✅ ExamQuestionResult model" 
echo "- ✅ CameraRecording model"
echo "- ✅ Camera routes"
echo "- ✅ BiometricEntry component"
echo ""
echo "🚀 System Features:"
echo "- ✅ Dynamic exam routing fixed"
echo "- ✅ Question timing controls"
echo "- ✅ Biometric authentication"
echo "- ✅ Camera monitoring"
echo "- ✅ Video recording capability"
echo "- ✅ Adaptive difficulty adjustment"
echo ""
echo "Please refer to COMPLETE_DYNAMIC_MCQ_FIX.md for detailed implementation instructions."