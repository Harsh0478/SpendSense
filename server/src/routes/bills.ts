import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Bill } from '../models/Bill.js';
import { Transaction } from '../models/Transaction.js';
import type { AuthenticatedRequest } from '../middleware/requireAuth.js';

export const billRouter = Router();
const uid = (req: AuthenticatedRequest) => req.authUserId!;

const billSchema = z.object({
  title: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(60).default('Bills'),
  amountPaise: z.number().int().positive(),
  dueDate: z.iso.datetime(),
  frequency: z.enum(['ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  remindDaysBefore: z.number().int().min(0).max(30).default(3),
  notes: z.string().max(500).optional(),
});

const paymentSchema = z.object({
  paidAt: z.iso.datetime().optional(),
  // Prevent a stale/double-tapped calendar item from paying the next recurrence.
  expectedDueDate: z.iso.datetime(),
});

function advanceDueDate(date: Date, frequency: string): Date {
  const next = new Date(date);
  const originalDay = next.getDate();
  if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1, 1);
  else if (frequency === 'QUARTERLY') next.setMonth(next.getMonth() + 3, 1);
  else if (frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1, 1);
  else return next;
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

billRouter.get('/', async (req, res, next) => {
  try {
    const rows = await Bill.find({ ownerUserId: uid(req), status: { $ne: 'CANCELLED' } })
      .sort({ dueDate: 1 }).limit(200).lean();
    return res.json({ data: rows });
  } catch (error) { return next(error); }
});

billRouter.post('/', async (req, res, next) => {
  try {
    const body = billSchema.parse(req.body);
    const row = await Bill.create({ ...body, dueDate: new Date(body.dueDate), ownerUserId: uid(req) });
    return res.status(201).json({ data: row });
  } catch (error) { return next(error); }
});

billRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = billSchema.partial().parse(req.body);
    const row = await Bill.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: uid(req) },
      { ...body, ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}) },
      { new: true, runValidators: true },
    );
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

// A bill payment is also a real expense. Save the transaction and advance the
// recurring bill in one MongoDB transaction so the ledger and calendar cannot drift.
billRouter.post('/:id/pay', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const body = paymentSchema.parse(req.body);
    const userId = uid(req);
    const expectedDueDate = new Date(body.expectedDueDate);
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    let savedBill: unknown;

    await session.withTransaction(async () => {
      const bill = await Bill.findOne({
        _id: req.params.id,
        ownerUserId: userId,
        status: 'UPCOMING',
        dueDate: expectedDueDate,
      }).session(session);

      if (!bill) {
        throw Object.assign(new Error('This bill has changed or was already marked paid. Refresh the calendar and try again.'), { status: 409 });
      }

      const scheduledDateKey = bill.dueDate.toISOString().slice(0, 10);
      const dedupeKey = `bill-${bill._id}-${scheduledDateKey}`;
      await Transaction.create([{
        ownerUserId: userId,
        amountPaise: bill.amountPaise,
        type: 'DEBIT',
        merchant: bill.title,
        category: bill.category || 'Bills',
        occurredAt: paidAt,
        source: 'MANUAL',
        note: `Bill payment · ${bill.frequency.toLowerCase()}`,
        dedupeKey,
      }], { session });

      bill.lastPaidAt = paidAt;
      if (bill.frequency === 'ONCE') bill.status = 'PAID';
      else bill.dueDate = advanceDueDate(bill.dueDate, bill.frequency);
      await bill.save({ session });
      savedBill = bill.toObject();
    });

    return res.json({ data: savedBill });
  } catch (error) { return next(error); }
  finally { await session.endSession(); }
});

billRouter.delete('/:id', async (req, res, next) => {
  try {
    const row = await Bill.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: uid(req) },
      { status: 'CANCELLED' },
      { new: true },
    );
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});
