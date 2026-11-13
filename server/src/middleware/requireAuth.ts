import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export interface AuthenticatedRequest extends Request { authUserId?: string; }
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header=req.header('authorization'); const token=header?.startsWith('Bearer ')?header.slice(7):'';
  if(!token || !env.JWT_SECRET) return res.status(401).json({error:'UNAUTHORIZED',message:'A valid JWT session is required.'});
  try { const payload=jwt.verify(token,env.JWT_SECRET); if(typeof payload==='string' || typeof payload.sub!=='string') return res.status(401).json({error:'UNAUTHORIZED'}); (req as AuthenticatedRequest).authUserId=payload.sub; return next(); }
  catch { return res.status(401).json({error:'UNAUTHORIZED',message:'Your session is invalid or expired.'}); }
}
