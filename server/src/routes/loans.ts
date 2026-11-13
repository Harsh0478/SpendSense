import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Loan } from '../models/Loan.js';
import { Transaction } from '../models/Transaction.js';
import type { AuthenticatedRequest } from '../middleware/requireAuth.js';

export const loanRouter = Router();
const uid = (req: AuthenticatedRequest) => req.authUserId!;

const loanSchema = z.object({
  lender: z.string().trim().min(1).max(100),
  loanType: z.enum(['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'OTHER']).default('OTHER'),
  principalPaise: z.number().int().positive(),
  outstandingPaise: z.number().int().min(0),
  annualInterestRate: z.number().min(0).max(100).default(0),
  emiPaise: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(31),
  nextDueDate: z.iso.datetime(),
  remainingInstallments: z.number().int().min(0).default(0),
});

const paymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  paidAt: z.iso.datetime().optional(),
});

function nextEmiDate(current: Date, dueDay: number): Date {
  const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1, current.getHours(), current.getMinutes(), current.getSeconds());
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  nextMonth.setDate(Math.min(dueDay, lastDay));
  return nextMonth;
}

loanRouter.get('/', async (req, res, next) => {
  try {
    const rows = await Loan.find({ ownerUserId: uid(req) }).sort({ nextDueDate: 1 }).lean();
    return res.json({ data: rows });
  } catch (error) { return next(error); }
});

loanRouter.post('/', async (req, res, next) => {
  try {
    const body = loanSchema.parse(req.body);
    if (body.outstandingPaise > body.principalPaise) {
      return res.status(400).json({ error: 'INVALID_LOAN_BALANCE', message: 'Outstanding balance cannot exceed the original principal.' });
    }
    const row = await Loan.create({ ...body, nextDueDate: new Date(body.nextDueDate), ownerUserId: uid(req), status: 'ACTIVE' });
    return res.status(201).json({ data: row });
  } catch (error) { return next(error); }
});

loanRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = loanSchema.partial().parse(req.body);
    const row = await Loan.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: uid(req) },
      { ...body, ...(body.nextDueDate ? { nextDueDate: new Date(body.nextDueDate) } : {}) },
      { new: true, runValidators: true },
    );
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

// Keep the loan balance and expense ledger in one Atlas transaction.
loanRouter.post('/:id/payment', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const body = paymentSchema.parse(req.body);
    const userId = uid(req);
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    const dedupeDate = paidAt.toISOString().slice(0, 10);
    let result: unknown;

    await session.withTransaction(async () => {
      const loan = await Loan.findOne({ _id: req.params.id, ownerUserId: userId, status: 'ACTIVE' }).session(session);
      if (!loan) throw Object.assign(new Error('Active loan not found.'), { status: 404 });

      const monthlyInterestPaise = Math.round(loan.outstandingPaise * (loan.annualInterestRate / 1200));
      if (body.amountPaise < monthlyInterestPaise) {
        throw Object.assign(new Error('The payment is lower than the estimated monthly interest. Check the EMI amount before recording it.'), { status: 400 });
      }

      const dedupeKey = `loan-${loan._id}-${dedupeDate}-${body.amountPaise}`;
      const [transaction] = await Transaction.create([{
        ownerUserId: userId,
        amountPaise: body.amountPaise,
        type: 'DEBIT',
        merchant: loan.lender,
        category: 'EMI',
        occurredAt: paidAt,
        source: 'MANUAL',
        note: `Loan EMI payment · ${loan.loanType}`,
        dedupeKey,
      }], { session });

      if (!transaction) throw new Error('The EMI transaction could not be created.');

      const principalPaidPaise = Math.max(0, body.amountPaise - monthlyInterestPaise);
      loan.outstandingPaise = Math.max(0, loan.outstandingPaise - principalPaidPaise);
      loan.remainingInstallments = Math.max(0, loan.remainingInstallments - 1);
      if (loan.outstandingPaise === 0) loan.status = 'CLOSED';
      else loan.nextDueDate = nextEmiDate(loan.nextDueDate, loan.dueDay);
      await loan.save({ session });
      result = { loan: loan.toObject(), transaction: transaction.toObject() };
    });

    return res.status(201).json({ data: result });
  } catch (error) { return next(error); }
  finally { await session.endSession(); }
});

loanRouter.delete('/:id', async (req, res, next) => {
  try {
    const row = await Loan.findOneAndDelete({ _id: req.params.id, ownerUserId: uid(req) });
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.status(204).send();
  } catch (error) { return next(error); }
});
