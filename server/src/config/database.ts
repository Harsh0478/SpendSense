import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  await mongoose.connect(env.MONGODB_URI, { autoIndex: process.env.NODE_ENV !== 'production' });
  console.info('MongoDB connected');
}
