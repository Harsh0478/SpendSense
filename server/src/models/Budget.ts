import { Schema, model } from 'mongoose';
const budgetSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  limitPaise: { type: Number, required: true, min: 1 },
  period: { type: String, enum: ['MONTHLY'], default: 'MONTHLY' },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  alertAtPercent: { type: Number, min: 1, max: 100, default: 80 },
}, { timestamps: true, versionKey: false });
budgetSchema.index({ ownerUserId: 1, category: 1, month: 1 }, { unique: true });
export const Budget = model('Budget', budgetSchema);
