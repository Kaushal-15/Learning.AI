/**
 * One-off script to create compound indexes for Learning.AI serverless DB
 * Usage: node scripts/create-indexes.js
 */

require('dotenv').config({ path: 'app/Backend/.env' });
const mongoose = require('mongoose');

async function createIndexes() {
  const uri = (process.env.MONGODB_URI || process.env.EXAM_MONGODB_URI || '').replace(/^["']|["']$/g, '').trim();

  if (!uri) {
    console.error('❌ MONGODB_URI or EXAM_MONGODB_URI environment variable is required to create indexes.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB to create compound indexes...');
  try {
    await mongoose.connect(uri, {
      dbName: 'learning-ai',
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('⚡ Creating index on exam_sessions: { examId: 1, userId: 1, status: 1 }');
    const res1 = await db.collection('examsessions').createIndex(
      { examId: 1, userId: 1, status: 1 },
      { background: true, name: 'idx_exam_user_status' }
    );
    console.log('   Result:', res1);

    console.log('⚡ Creating index on exam_sessions: { examId: 1, studentId: 1, status: 1 }');
    const res2 = await db.collection('examsessions').createIndex(
      { examId: 1, studentId: 1, status: 1 },
      { background: true, name: 'idx_exam_student_status' }
    );
    console.log('   Result:', res2);

    console.log('⚡ Creating index on camera_recordings: { sessionId: 1, status: 1 }');
    const res3 = await db.collection('camerarecordings').createIndex(
      { sessionId: 1, status: 1 },
      { background: true, name: 'idx_session_status' }
    );
    console.log('   Result:', res3);

    console.log('🎉 All compound indexes successfully created!');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createIndexes();

