import { Schema, model, type InferSchemaType } from 'mongoose';

const transactionSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  amountPaise: { type: Number, required: true, min: 1 },
  type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  merchant: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
  occurredAt: { type: Date, required: true },
  source: { type: String, enum: ['MANUAL', 'CSV', 'PDF', 'NOTIFICATION', 'SMS'], default: 'MANUAL' },
  upiRef: { type: String, maxlength: 40 },
  note: { type: String, maxlength: 500 },
  tags: { type: [String], default: [] },
  dedupeKey: { type: String, required: true },
}, { timestamps: true, versionKey: false });

transactionSchema.index({ ownerUserId: 1, occurredAt: -1 });
transactionSchema.index({ ownerUserId: 1, dedupeKey: 1 }, { unique: true });

export type TransactionDocument = InferSchemaType<typeof transactionSchema>;
export const Transaction = model('Transaction', transactionSchema);
