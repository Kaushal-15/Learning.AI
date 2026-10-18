/**
 * schedulerService.js
 *
 * Cron jobs must NOT run on Vercel — the process is frozen between requests
 * and there is no persistent Node process to keep cron alive.
 *
 * To recreate the weekly content generation job on Vercel:
 *   1. Add a Vercel Cron route: POST /api/cron/generate-content
 *   2. Protect it with a CRON_SECRET header check.
 *   3. In vercel.json add:
 *        "crons": [{ "path": "/api/cron/generate-content", "schedule": "0 0 * * 0" }]
 *
 * Registered cron jobs (for reference when creating Vercel Cron routes):
 *   • "0 0 * * 0"  — Every Sunday at midnight UTC
 *                    Runs: content-generator/generator.py --roadmap all
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Initialize the weekly content generation scheduler.
 * Guard: only runs when NOT on Vercel (i.e. traditional long-running host).
 */
const initScheduler = () => {
    if (process.env.VERCEL) {
        console.log(
            '⏭️  Skipping cron scheduler — running on Vercel. ' +
            'Use Vercel Cron routes instead (see schedulerService.js comments).'
        );
        return;
    }

    const cron = require('node-cron'); // lazy-require — not needed on Vercel

    console.log('Initializing Weekly Content Generation Scheduler...');

    // Schedule task to run every Sunday at midnight (0 0 * * 0)
    cron.schedule('0 0 * * 0', () => {
        console.log('⏰ Triggering weekly content generation task...');
        runContentGeneration();
    });

    console.log('✅ Scheduler initialized. Task scheduled for every Sunday at midnight.');
};

/**
 * Run the Python content generator script.
 * Used by both the cron job (traditional hosts) and the Vercel Cron route handler.
 */
const runContentGeneration = () => {
    const scriptPath = path.join(__dirname, '../content-generator/generator.py');

    // Use python from venv
    const pythonPath = path.join(__dirname, '../content-generator/venv/bin/python');
    console.log(`🚀 Spawning python process: ${pythonPath} ${scriptPath} --roadmap all`);

    const pythonProcess = spawn(pythonPath, [scriptPath, '--roadmap', 'all']);

    pythonProcess.stdout.on('data', (data) => {
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
