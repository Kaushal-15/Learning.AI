const ExamRecording = require('../models/ExamRecording');
const storageService = require('./storageService');

/**
 * Recording Service
 * Handles video recording management and cloud storage references.
 * Completely eliminates local disk dependencies (no fs.mkdir / fs.appendFile / fs.stat / fs.unlink).
 */

/**
 * Check if recording is enabled globally
 */
function isRecordingEnabled() {
    return process.env.RECORDING_ENABLED !== 'false';
}

/**
 * Start a new recording session
 */
async function startRecording({ examId, sessionId, studentName, registerNumber, triggeredBy, adminId }) {
    if (!isRecordingEnabled()) {
        return {
            success: false,
            enabled: false,
            message: 'Cloud recording is disabled via RECORDING_ENABLED=false.'
        };
    }

    try {
        const keyPrefix = `recordings/${examId}/${adminId || 'session'}/${sessionId}/`;
        const fileName = `${sessionId}.webm`;

        const recording = new ExamRecording({
            examId,
            sessionId,
            studentName,
            registerNumber,
            filePath: keyPrefix,
            fileName,
            recordingStartTime: new Date(),
            triggeredBy: triggeredBy || 'admin',
            triggeredByAdmin: adminId,
            status: 'recording',
            chunksReceived: 0,
            fileSize: 0
        });

        await recording.save();

        return {
            success: true,
            enabled: true,
            recordingId: recording._id,
            fileName,
            keyPrefix
        };
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

/**
 * Upload video chunk metadata / tracking (direct-to-cloud replaces local disk writes)
 */
async function uploadChunk({ recordingId, chunkData, chunkNumber }) {
    if (!isRecordingEnabled()) {
        return {
            success: false,
            enabled: false,
            message: 'Recording disabled'
        };
    }

    try {
        const recording = await ExamRecording.findById(recordingId);

        if (!recording) {
            throw new Error('Recording not found');
        }

        if (recording.status !== 'recording') {
            throw new Error('Recording is not active');
        }

        // Increment chunk count
        recording.chunksReceived = (recording.chunksReceived || 0) + 1;
        if (chunkData) {
            const chunkSize = Buffer.isBuffer(chunkData) ? chunkData.length :
                             (typeof chunkData === 'string' ? Buffer.byteLength(chunkData, 'base64') : 0);
            recording.fileSize = (recording.fileSize || 0) + chunkSize;
        }

        await recording.save();

        return {
            success: true,
            chunksReceived: recording.chunksReceived,
            fileSize: recording.fileSize
        };
    } catch (error) {
        console.error('Error updating chunk metadata:', error);

        try {
            await ExamRecording.findByIdAndUpdate(recordingId, {
                status: 'failed',
                errorMessage: error.message
            });
        } catch (updateError) {
            console.error('Error updating recording status:', updateError);
        }

        throw error;
    }
}

/**
 * Stop recording
 */
async function stopRecording(recordingId) {
    try {
        const recording = await ExamRecording.findById(recordingId);

        if (!recording) {
            throw new Error('Recording not found');
        }

        recording.recordingEndTime = new Date();
        recording.status = 'completed';

        // Calculate duration in seconds based on timestamps (no local fs stat)
        const duration = (recording.recordingEndTime - recording.recordingStartTime) / 1000;
        recording.duration = Math.max(0, Math.round(duration));

        await recording.save();

        return {
            success: true,
            duration: recording.duration,
            fileSize: recording.fileSize || 0
        };
    } catch (error) {
        console.error('Error stopping recording:', error);
        throw error;
    }
}

/**
 * Get recordings for an exam
 */
async function getExamRecordings(examId) {
    try {
        const recordings = await ExamRecording.find({ examId })
            .populate('sessionId', 'studentName registerNumber')
            .sort({ recordingStartTime: -1 });

        return recordings;
    } catch (error) {
        console.error('Error getting exam recordings:', error);
        throw error;
    }
}

/**
 * Get recording by ID
 */
async function getRecording(recordingId) {
    try {
        const recording = await ExamRecording.findById(recordingId)
            .populate('examId', 'title examCode')
            .populate('sessionId', 'studentName registerNumber');

        return recording;
    } catch (error) {
        console.error('Error getting recording:', error);
        throw error;
    }
}

/**
 * Delete recording (removes DB record, no local fs.unlink)
 */
async function deleteRecording(recordingId) {
    try {
        const recording = await ExamRecording.findById(recordingId);

        if (!recording) {
            throw new Error('Recording not found');
        }

        // Delete record from database
        await ExamRecording.findByIdAndDelete(recordingId);

        return {
            success: true,
            message: 'Recording deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting recording:', error);
        throw error;
    }
}

/**
 * Get active recording for a session
 */
async function getActiveRecording(sessionId) {
    try {
        const recording = await ExamRecording.findOne({
            sessionId,
            status: 'recording'
        });

        return recording;
    } catch (error) {
        console.error('Error getting active recording:', error);
        throw error;
    }
}

module.exports = {
    isRecordingEnabled,
    startRecording,
    uploadChunk,
    stopRecording,
    getExamRecordings,
    getRecording,
    deleteRecording,
    getActiveRecording
};
