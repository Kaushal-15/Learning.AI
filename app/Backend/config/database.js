/**
 * database.js — Serverless-safe MongoDB connector.
 *
 * Uses a module-level cache so the same mongoose connection is reused across
 * warm Vercel invocations. On failure the cached promise is reset so the next
 * request retries from scratch.
 *
 * Safe for both serverless (Vercel) and traditional (long-running) deployments.
 */

const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, _listenersRegistered: false };
}

const connectDB = async () => {
  // Return the already-open connection immediately.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If a connection attempt is already in-flight, await it.
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      cached.promise = null;
      cached.conn = null;
      throw e;
    }
  }

  const mongoURI =
    process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_TEST_URI
      : process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  cached.promise = mongoose
    .connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000, // fail fast in serverless
      socketTimeoutMS: 45000,
      bufferCommands: false,
    })
    .then((m) => {
      console.log('✅ MongoDB connected:', m.connection.host);

      // Only register process-level listeners once.
      if (!cached._listenersRegistered) {
        cached._listenersRegistered = true;

        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err.message);
          // Reset so the next request retries.
          cached.conn = null;
          cached.promise = null;
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️  MongoDB disconnected — will reconnect on next request');
          cached.conn = null;
          cached.promise = null;
        });

        // Graceful shutdown only makes sense for long-running servers.
        if (!process.env.VERCEL) {
          process.on('SIGINT', async () => {
            try {
              await mongoose.connection.close();
              console.log('📴 MongoDB connection closed');
              process.exit(0);
            } catch (err) {
              console.error('Error closing MongoDB:', err.message);
              process.exit(1);
            }
          });
        }
      }

      return m.connection;
    })
    .catch((err) => {
      console.error('❌ MongoDB connection failed:', err.message);
      // Reset so the next request retries.
      cached.conn = null;
      cached.promise = null;
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;