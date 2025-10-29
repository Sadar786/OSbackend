// server/config/db.js
const mongoose = require('mongoose');

let cached = global._mongooseConn;

async function connectDB() {
  if (cached) return cached;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing');

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,   // fail fast if Atlas isn’t reachable
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  global._mongooseConn = conn;
  console.log('✅ MongoDB connected');
  return conn;
}

module.exports = connectDB;
