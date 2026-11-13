import { Schema, model } from 'mongoose';
const loanSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  lender: { type: String, required: true, trim: true, maxlength: 100 },
  loanType: { type: String, enum: ['PERSONAL','HOME','VEHICLE','EDUCATION','OTHER'], default: 'OTHER' },
  principalPaise: { type: Number, required: true, min: 1 },
  outstandingPaise: { type: Number, required: true, min: 0 },
  annualInterestRate: { type: Number, min: 0, max: 100, default: 0 },
  emiPaise: { type: Number, required: true, min: 1 },
  dueDay: { type: Number, min: 1, max: 31, required: true },
  nextDueDate: { type: Date, required: true },
  remainingInstallments: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['ACTIVE','CLOSED'], default: 'ACTIVE' },
}, { timestamps: true, versionKey: false });
loanSchema.index({ ownerUserId: 1, nextDueDate: 1, status: 1 });
export const Loan = model('Loan', loanSchema);
