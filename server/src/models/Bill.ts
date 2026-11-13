import { Schema, model } from 'mongoose';
const billSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, trim: true, maxlength: 60, default: 'Bills' },
  amountPaise: { type: Number, required: true, min: 1 },
  dueDate: { type: Date, required: true },
  frequency: { type: String, enum: ['ONCE','MONTHLY','QUARTERLY','YEARLY'], default: 'MONTHLY' },
  status: { type: String, enum: ['UPCOMING','PAID','CANCELLED'], default: 'UPCOMING' },
  remindDaysBefore: { type: Number, min: 0, max: 30, default: 3 },
  lastPaidAt: { type: Date },
  notes: { type: String, maxlength: 500 },
}, { timestamps: true, versionKey: false });
billSchema.index({ ownerUserId: 1, dueDate: 1, status: 1 });
export const Bill = model('Bill', billSchema);
