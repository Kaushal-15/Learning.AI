import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const FileUpload = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            validateAndSetFile(selectedFile);
        }
    };

    const validateAndSetFile = (file) => {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!validTypes.includes(file.type)) {
            setError('Invalid file type. Please upload PDF, DOCX, or TXT.');
            setFile(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('File size exceeds 5MB limit.');
            setFile(null);
            return;
        }

        setFile(file);
        setError(null);
        setSuccess(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            validateAndSetFile(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch('http://localhost:3000/api/custom-learning/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setFile(null);
                if (onUploadSuccess) {
                    onUploadSuccess(data.documentId);
                }
            } else {
                setError(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error(err);
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Upload Study Material
            </h3>

            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'
                    }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                />

                {file ? (
                    <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-blue-400 mb-2" />
                        <p className="text-white font-medium truncate max-w-full">{file.name}</p>
                        <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                            onClick={() => setFile(null)}
                            className="text-red-400 text-sm mt-2 hover:text-red-300"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-300 font-medium">Click to upload or drag & drop</p>
                        <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT (Max 5MB)</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-200 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    File processed successfully!
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`w-full mt-4 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${!file || uploading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20'
                    }`}
            >
                {uploading ? (
                    <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    'Upload & Process'
                )}
            </button>
        </div>
    );
};

export default FileUpload;
