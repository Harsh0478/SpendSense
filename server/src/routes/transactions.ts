import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';
import { createTransactionSchema, updateTransactionSchema } from '../validators/transaction.js';
import type { AuthenticatedRequest } from '../middleware/requireAuth.js';

export const transactionRouter = Router();

transactionRouter.get('/', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter: Record<string, unknown> = { ownerUserId: userId };
    if (req.query.type === 'DEBIT' || req.query.type === 'CREDIT') filter.type = req.query.type;
    if (typeof req.query.category === 'string' && req.query.category.trim()) filter.category = req.query.category.trim();
    if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
      const occurredAt: Record<string, Date> = {};
      if (typeof req.query.from === 'string' && !Number.isNaN(Date.parse(req.query.from))) occurredAt.$gte = new Date(req.query.from);
      if (typeof req.query.to === 'string' && !Number.isNaN(Date.parse(req.query.to))) occurredAt.$lte = new Date(req.query.to);
      if (Object.keys(occurredAt).length) filter.occurredAt = occurredAt;
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const safe = req.query.q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ merchant: { $regex: safe, $options: 'i' } }, { category: { $regex: safe, $options: 'i' } }, { note: { $regex: safe, $options: 'i' } }];
    }
    const [rows, total] = await Promise.all([
      Transaction.find(filter).sort({ occurredAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

transactionRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const row = await Transaction.findOne({ _id: req.params.id, ownerUserId: userId }).lean();
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

transactionRouter.post('/', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const payload = createTransactionSchema.parse(req.body);
    if (payload.accountId && !await Account.exists({ _id: payload.accountId, ownerUserId: userId, isArchived: { $ne: true } })) return res.status(400).json({ error: 'INVALID_ACCOUNT', message: 'Select an active account that belongs to your profile.' });
    const row = await Transaction.create({ ...payload, ownerUserId: userId, occurredAt: new Date(payload.occurredAt) });
    return res.status(201).json({ data: row });
  } catch (error) { return next(error); }
});

transactionRouter.patch('/:id', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const payload = updateTransactionSchema.parse(req.body);
    if (payload.accountId && !await Account.exists({ _id: payload.accountId, ownerUserId: userId, isArchived: { $ne: true } })) return res.status(400).json({ error: 'INVALID_ACCOUNT', message: 'Select an active account that belongs to your profile.' });
    const update = { ...payload, ...(payload.occurredAt ? { occurredAt: new Date(payload.occurredAt) } : {}) };
    const row = await Transaction.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: userId }, update, { new: true, runValidators: true },
    );
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

transactionRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const row = await Transaction.findOneAndDelete({ _id: req.params.id, ownerUserId: userId });
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.status(204).send();
  } catch (error) { return next(error); }
});
