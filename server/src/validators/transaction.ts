import { z } from 'zod';

export const createTransactionSchema = z.object({
  amountPaise: z.number().int().positive(),
  type: z.enum(['DEBIT', 'CREDIT']),
  merchant: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  accountId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  occurredAt: z.iso.datetime(),
  source: z.enum(['MANUAL', 'CSV', 'PDF', 'NOTIFICATION', 'SMS']).default('MANUAL'),
  upiRef: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).max(20).default([]),
  dedupeKey: z.string().min(8).max(128),
});

export const updateTransactionSchema = createTransactionSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one transaction field is required.' },
);
