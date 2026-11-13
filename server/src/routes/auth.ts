import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';
import { CategoryModel } from '../models/Category.js';
export const authRouter = Router();

const DEFAULT_CATEGORIES = [
  ...['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Rent', 'EMI', 'Other'].map((name) => ({ name, type: 'DEBIT' as const })),
  ...['Salary', 'Business', 'Investments', 'Other income'].map((name) => ({ name, type: 'CREDIT' as const })),
];
const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(8).max(72) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) });
function tokenFor(id: string) { if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured'); return jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }); }
authRouter.post('/register', async (req,res,next) => { try { const input=registerSchema.parse(req.body); const email=input.email.toLowerCase(); if(await User.exists({email})) return res.status(409).json({error:'EMAIL_EXISTS',message:'An account with this email already exists.'}); const passwordHash=await bcrypt.hash(input.password,12); const user=await User.create({name:input.name,email,passwordHash}); await CategoryModel.insertMany(DEFAULT_CATEGORIES.map((category) => ({ ...category, ownerUserId: String(user._id), isDefault: true }))); return res.status(201).json({token:tokenFor(String(user._id)),user:{id:String(user._id),name:user.name,email:user.email}}); } catch(e){return next(e);} });
authRouter.post('/login', async (req,res,next) => { try { const input=loginSchema.parse(req.body); const user=await User.findOne({email:input.email.toLowerCase()}).select('+passwordHash'); if(!user || !(await bcrypt.compare(input.password,user.passwordHash))) return res.status(401).json({error:'INVALID_CREDENTIALS',message:'Email or password is incorrect.'}); return res.json({token:tokenFor(String(user._id)),user:{id:String(user._id),name:user.name,email:user.email}}); } catch(e){return next(e);} });


authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId;
    const user = await User.findById(userId).select('_id name email').lean();
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Your account no longer exists.' });
    return res.json({ data: { id: String(user._id), name: user.name, email: user.email } });
  } catch (error) { return next(error); }
});


const profileUpdateSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254) });
authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).authUserId;
    const email = input.email.toLowerCase();
    const duplicate = await User.findOne({ email, _id: { $ne: userId } }).select('_id').lean();
    if (duplicate) return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'That email address is already used by another SpendSense account.' });
    const user = await User.findByIdAndUpdate(userId, { $set: { name: input.name, email } }, { new: true, runValidators: true }).select('_id name email').lean();
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Your account could not be found.' });
    return res.json({ data: { id: String(user._id), name: user.name, email: user.email } });
  } catch (error) { return next(error); }
});
