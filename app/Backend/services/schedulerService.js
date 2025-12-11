const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Initialize the weekly content generation scheduler
 */
const initScheduler = () => {
    console.log('Initializing Weekly Content Generation Scheduler...');

    // Schedule task to run every Sunday at midnight (0 0 * * 0)
    cron.schedule('0 0 * * 0', () => {
        console.log('⏰ Triggering weekly content generation task...');
        runContentGeneration();
    });

    console.log('✅ Scheduler initialized. Task scheduled for every Sunday at midnight.');
};

/**
 * Run the Python content generator script
 */
const runContentGeneration = () => {
    const scriptPath = path.join(__dirname, '../content-generator/generator.py');

    // Use python from venv
    const pythonPath = path.join(__dirname, '../content-generator/venv/bin/python');
    console.log(`🚀 Spawning python process: ${pythonPath} ${scriptPath} --roadmap all`);

    const pythonProcess = spawn(pythonPath, [scriptPath, '--roadmap', 'all']);

    pythonProcess.stdout.on('data', (data) => {
        // Clean up output to avoid excessive newlines
        const output = data.toString().trim();
        if (output) {
            console.log(`[Content Generator]: ${output}`);
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
            console.error(`[Content Generator Error]: ${output}`);
        }
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Content generation process completed successfully');
        } else {
            console.error(`❌ Content generation process exited with code ${code}`);
        }
    });
};

module.exports = { initScheduler, runContentGeneration };
