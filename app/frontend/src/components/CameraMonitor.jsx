import { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff, AlertCircle, Disc } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function CameraMonitor({ sessionId, examId, isRequired = false, onCameraStatus }) {
    const { isDarkMode } = useTheme();
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState(null);
    const [error, setError] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Start camera
    const startCamera = async () => {
        try {
            setError('');
            setPermissionDenied(false);

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setStream(mediaStream);
            setCameraActive(true);

            if (onCameraStatus) {
                onCameraStatus({ active: true, error: null });
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Failed to access camera');
            setPermissionDenied(true);
            setCameraActive(false);

            if (onCameraStatus) {
                onCameraStatus({ active: false, error: err.message });
            }
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setCameraActive(false);

            if (onCameraStatus) {
                onCameraStatus({ active: false, error: null });
            }
        }
    };

    // Check for active recording
    const checkActiveRecording = async () => {
        try {
            const response = await fetch(`${API_BASE}/camera/active-recording/${sessionId}`, {
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success && data.isRecording && data.data) {
                setRecordingId(data.data._id);
                startRecording(data.data._id);
            }
        } catch (err) {
            console.error('Error checking active recording:', err);
        }
    };

    // Start recording
    const startRecording = (recId) => {
        if (!stream || !MediaRecorder.isTypeSupported('video/webm')) {
            console.error('MediaRecorder not supported');
            return;
        }

        try {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8',
                videoBitsPerSecond: 250000 // 250 kbps for smaller file size
            });

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);

                    // Upload chunk every 10 seconds
                    if (chunksRef.current.length >= 10) {
                        await uploadChunks(recId);
                    }
                }
            };

            mediaRecorder.onstart = () => {
                setIsRecording(true);
                chunksRef.current = [];
            };

            mediaRecorder.onstop = async () => {
                setIsRecording(false);
                // Upload remaining chunks
                if (chunksRef.current.length > 0) {
                    await uploadChunks(recId);
                }
            };

            // Record in 1-second chunks
            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
            setRecordingId(recId);
        } catch (err) {
            console.error('Error starting recording:', err);
        }
    };

    // Upload video chunks
    const uploadChunks = async (recId) => {
        if (chunksRef.current.length === 0) return;

        try {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64data = reader.result;

                await fetch(`${API_BASE}/camera/upload-chunk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        recordingId: recId,
                        chunkData: base64data,
                        chunkNumber: Date.now()
                    })
                });

                // Clear uploaded chunks
                chunksRef.current = [];
            };

            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Error uploading chunks:', err);
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            setRecordingId(null);
        }
    };

    // Initialize camera on mount if required
    useEffect(() => {
        console.log('🎥 CameraMonitor useEffect - isRequired:', isRequired, 'sessionId:', sessionId);

        let checkInterval;

        if (isRequired) {
            console.log('📸 Auto-starting camera (isRequired=true)');
            startCamera();

            // AUTO-RESTART: Check camera status every 5 seconds
            checkInterval = setInterval(() => {
                if (!cameraActive && isRequired && !permissionDenied) {
                    console.warn('⚠️ Camera stopped - attempting auto-restart...');
                    startCamera();
                }
            }, 5000);
        } else {
            console.log('⏭️ Camera not required - skipping auto-start');
        }

        // Check for active recording
        if (sessionId) {
            console.log('🔍 Checking for active recording...');
            checkActiveRecording();
        }

        // Poll for recording status every 5 seconds
        const interval = setInterval(() => {
            if (sessionId) {
                checkActiveRecording();
            }
        }, 5000);

        return () => {
            console.log('🧹 CameraMonitor cleanup');
            if (checkInterval) clearInterval(checkInterval);
            clearInterval(interval);
            stopRecording();
            stopCamera();
        };
    }, [isRequired, sessionId]);

    // Auto-start recording when recording ID is detected
    useEffect(() => {
        if (recordingId && cameraActive && !isRecording) {
            startRecording(recordingId);
        } else if (!recordingId && isRecording) {
            stopRecording();
        }
    }, [recordingId, cameraActive]);

    if (!isRequired && !cameraActive) {
        return null;
    }

    return (
        <div className={`camera-monitor ${isDarkMode ? 'dark' : ''}`}>
            <div className="camera-container">
                {!cameraActive && !permissionDenied && (
                    <div className="camera-prompt">
                        <Camera size={32} />
                        <p>Camera Required</p>
                        <button onClick={startCamera} className="btn-enable-camera">
                            <Video size={20} />
                            Enable Camera
                        </button>
                    </div>
                )}

                {permissionDenied && (
                    <div className="camera-error">
                        <AlertCircle size={32} />
                        <p>Camera Access Denied</p>
                        <small>Please enable camera permissions to continue</small>
                        <button onClick={startCamera} className="btn-retry">
                            Try Again
                        </button>
                    </div>
                )}

                {cameraActive && (
                    <div className="camera-active">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="video-feed"
                        />
                        <div className="camera-status">
                            <div className="status-indicator">
                                <div className={`status-dot ${isRecording ? 'recording' : 'active'}`}></div>
                                <span>{isRecording ? 'Recording' : 'Camera Active'}</span>
                            </div>
                            {isRecording && (
                                <Disc size={16} className="recording-icon" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .camera-monitor {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                }

                .camera-container {
                    width: 200px;
                    height: 150px;
                    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    border-radius: 0.75rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    border: 2px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
                }

                .camera-prompt, .camera-error {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    text-align: center;
                }

                .camera-prompt svg, .camera-error svg {
                    color: ${isDarkMode ? '#64748b' : '#94a3b8'};
                    margin-bottom: 0.5rem;
                }

                .camera-prompt p, .camera-error p {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                    margin-bottom: 0.5rem;
                }

                .camera-error small {
                    font-size: 0.75rem;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    margin-bottom: 0.75rem;
                }

                .btn-enable-camera, .btn-retry {
                    padding: 0.5rem 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    transition: background 0.2s;
                }

                .btn-enable-camera:hover, .btn-retry:hover {
                    background: #2563eb;
                }

                .camera-active {
                    position: relative;
                    height: 100%;
                }

                .video-feed {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1); /* Mirror effect */
                }

                .camera-status {
                    position: absolute;
                    top: 0.5rem;
                    left: 0.5rem;
                    right: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(0, 0, 0, 0.6);
                    padding: 0.375rem 0.5rem;
                    border-radius: 0.375rem;
                    backdrop-filter: blur(4px);
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }

                .status-dot.active {
                    background: #10b981;
                }

                .status-dot.recording {
                    background: #ef4444;
                }

                .status-indicator span {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: white;
                }

                .recording-icon {
                    color: #ef4444;
                    animation: blink 1s infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }

                @keyframes blink {
                    0%, 50% {
                        opacity: 1;
                    }
                    51%, 100% {
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
