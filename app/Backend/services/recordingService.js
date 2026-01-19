const ExamRecording = require('../models/ExamRecording');
const fs = require('fs').promises;
const path = require('path');

/**
 * Recording Service
 * Handles video recording storage and management
 */

// Base directory for recordings
const RECORDINGS_DIR = path.join(__dirname, '../uploads/recordings');

/**
 * Ensure recordings directory exists
 */
async function ensureRecordingsDir() {
    try {
        await fs.mkdir(RECORDINGS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating recordings directory:', error);
    }
}

/**
 * Start a new recording session
 */
async function startRecording({ examId, sessionId, studentName, registerNumber, triggeredBy, adminId }) {
    try {
        await ensureRecordingsDir();

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${examId}_${registerNumber}_${timestamp}.webm`;
        const filePath = path.join(RECORDINGS_DIR, fileName);

        // Create recording record
        const recording = new ExamRecording({
            examId,
            sessionId,
            studentName,
            registerNumber,
            filePath,
            fileName,
            recordingStartTime: new Date(),
            triggeredBy: triggeredBy || 'admin',
            triggeredByAdmin: adminId,
            status: 'recording'
        });

        await recording.save();

        return {
            success: true,
            recordingId: recording._id,
            fileName
        };
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

/**
 * Upload video chunk
 */
async function uploadChunk({ recordingId, chunkData, chunkNumber }) {
    try {
        const recording = await ExamRecording.findById(recordingId);

        if (!recording) {
            throw new Error('Recording not found');
        }

        if (recording.status !== 'recording') {
            throw new Error('Recording is not active');
        }

        // Ensure directory exists
        await ensureRecordingsDir();

        // Convert base64 to buffer if needed
        let buffer;
        if (typeof chunkData === 'string') {
            // Remove data URL prefix if present
            const base64Data = chunkData.replace(/^data:video\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            buffer = chunkData;
        }

        // Append chunk to file
        await fs.appendFile(recording.filePath, buffer);

        // Update chunk count
        recording.chunksReceived = (recording.chunksReceived || 0) + 1;
        await recording.save();

        return {
            success: true,
            chunksReceived: recording.chunksReceived
        };
    } catch (error) {
        console.error('Error uploading chunk:', error);

        // Mark recording as failed
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

        // Get file stats
        try {
            const stats = await fs.stat(recording.filePath);
            recording.fileSize = stats.size;
        } catch (error) {
            console.error('Error getting file stats:', error);
        }

        recording.recordingEndTime = new Date();
        recording.status = 'completed';

        // Calculate duration in seconds
        const duration = (recording.recordingEndTime - recording.recordingStartTime) / 1000;
        recording.duration = Math.round(duration);

        await recording.save();

        return {
            success: true,
            duration: recording.duration,
            fileSize: recording.fileSize
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
 * Delete recording
 */
async function deleteRecording(recordingId) {
    try {
        const recording = await ExamRecording.findById(recordingId);

        if (!recording) {
            throw new Error('Recording not found');
        }

        // Delete file
        try {
            await fs.unlink(recording.filePath);
        } catch (error) {
            console.error('Error deleting recording file:', error);
        }

        // Delete record
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
    startRecording,
    uploadChunk,
    stopRecording,
    getExamRecordings,
    getRecording,
    deleteRecording,
    getActiveRecording
};
