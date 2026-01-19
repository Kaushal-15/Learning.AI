import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function BiometricCapture({ examId, studentName, registerNumber, onSuccess, onCancel }) {
    const { isDarkMode } = useTheme();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cameraActive, setCameraActive] = useState(false);

    // Start camera
    const startCamera = async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setStream(mediaStream);
            setCameraActive(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Failed to access camera. Please ensure camera permissions are granted.');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setCameraActive(false);
        }
    };

    // Capture photo
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoBase64);
        stopCamera();
    };

    // Retake photo
    const retakePhoto = () => {
        setCapturedPhoto(null);
        startCamera();
    };

    // Upload photo
    const uploadPhoto = async () => {
        if (!capturedPhoto) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/biometric/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    examId,
                    studentName,
                    registerNumber,
                    photoBase64: capturedPhoto
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to upload photo');
            }

            onSuccess(data.data);
        } catch (err) {
            console.error('Error uploading photo:', err);
            setError(err.message || 'Failed to upload photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className={`biometric-capture ${isDarkMode ? 'dark' : ''}`}>
            <div className="biometric-card">
                <div className="biometric-header">
                    <Camera className="biometric-icon" size={32} />
                    <h2>Biometric Verification</h2>
                    <p>Please capture a clear photo of your face for verification</p>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="biometric-content">
                    {!cameraActive && !capturedPhoto && (
                        <div className="camera-prompt">
                            <Camera size={64} className="camera-icon-large" />
                            <p>Click the button below to start your camera</p>
                            <button onClick={startCamera} className="btn-primary">
                                <Camera size={20} />
                                Start Camera
                            </button>
                        </div>
                    )}

                    {cameraActive && !capturedPhoto && (
                        <div className="camera-view">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="video-preview"
                            />
                            <div className="camera-overlay">
                                <div className="face-guide"></div>
                            </div>
                            <button onClick={capturePhoto} className="btn-capture">
                                <Camera size={24} />
                                Capture Photo
                            </button>
                        </div>
                    )}

                    {capturedPhoto && (
                        <div className="photo-preview">
                            <img src={capturedPhoto} alt="Captured" className="captured-image" />
                            <div className="photo-actions">
                                <button onClick={retakePhoto} className="btn-secondary">
                                    <RefreshCw size={20} />
                                    Retake
                                </button>
                                <button
                                    onClick={uploadPhoto}
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner-small"></div>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            Confirm & Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Hidden canvas for photo capture */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {onCancel && (
                    <button onClick={onCancel} className="btn-cancel">
                        <X size={20} />
                        Cancel
                    </button>
                )}
            </div>

            <style jsx>{`
                .biometric-capture {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: ${isDarkMode ? '#0f172a' : '#f8fafc'};
                }

                .biometric-card {
                    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    border-radius: 1rem;
                    padding: 2rem;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .biometric-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .biometric-icon {
                    color: #3b82f6;
                    margin-bottom: 1rem;
                }

                .biometric-header h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                    margin-bottom: 0.5rem;
                }

                .biometric-header p {
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #fee2e2;
                    color: #dc2626;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                }

                .biometric-content {
                    min-height: 400px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .camera-prompt {
                    text-align: center;
                }

                .camera-icon-large {
                    color: ${isDarkMode ? '#64748b' : '#94a3b8'};
                    margin-bottom: 1rem;
                }

                .camera-prompt p {
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    margin-bottom: 1.5rem;
                }

                .camera-view {
                    position: relative;
                    width: 100%;
                }

                .video-preview {
                    width: 100%;
                    border-radius: 0.5rem;
                    transform: scaleX(-1); /* Mirror effect */
                }

                .camera-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }

                .face-guide {
                    width: 200px;
                    height: 250px;
                    border: 3px dashed #3b82f6;
                    border-radius: 50%;
                    opacity: 0.5;
                }

                .btn-capture {
                    margin-top: 1rem;
                    width: 100%;
                    padding: 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: background 0.2s;
                }

                .btn-capture:hover {
                    background: #2563eb;
                }

                .photo-preview {
                    width: 100%;
                }

                .captured-image {
                    width: 100%;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                }

                .photo-actions {
                    display: flex;
                    gap: 1rem;
                }

                .btn-primary, .btn-secondary {
                    flex: 1;
                    padding: 1rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: #10b981;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #059669;
                }

                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: ${isDarkMode ? '#334155' : '#e2e8f0'};
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                }

                .btn-secondary:hover {
                    background: ${isDarkMode ? '#475569' : '#cbd5e1'};
                }

                .btn-cancel {
                    width: 100%;
                    margin-top: 1rem;
                    padding: 0.75rem;
                    background: transparent;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    border: 1px solid ${isDarkMode ? '#475569' : '#cbd5e1'};
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }

                .btn-cancel:hover {
                    background: ${isDarkMode ? '#1e293b' : '#f1f5f9'};
                }

                .spinner-small {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
