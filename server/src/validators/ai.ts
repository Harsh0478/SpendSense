import { z } from 'zod';
export const categorySuggestionSchema = z.object({ category: z.enum(['Food','Groceries','Transport','Shopping','Bills','Entertainment','Health','Education','Travel','Rent','EMI','Investments','Transfers','Salary','Other']), confidence: z.number().min(0).max(1), reason: z.string().max(240) });
export const chatSchema = z.object({ message: z.string().trim().min(1).max(500) });
