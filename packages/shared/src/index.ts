import { z } from 'zod';

export const transactionTypeSchema = z.enum(['DEBIT', 'CREDIT']);
export const moneySchema = z.number().int().nonnegative();
export const categorySchema = z.enum([
  'Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health',
  'Education', 'Travel', 'Rent', 'EMI', 'Investments', 'Transfers', 'Salary', 'Other',
]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type Category = z.infer<typeof categorySchema>;
