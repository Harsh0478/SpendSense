import { createHash } from 'node:crypto';

export function transactionDedupeKey(input: {
  amountPaise: number; type: 'DEBIT' | 'CREDIT'; merchant: string; occurredAt: string | Date; upiRef?: string;
}) {
  const canonical = [input.amountPaise, input.type, input.merchant.trim().toLowerCase(), new Date(input.occurredAt).toISOString().slice(0, 10), input.upiRef?.trim() ?? ''].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}
