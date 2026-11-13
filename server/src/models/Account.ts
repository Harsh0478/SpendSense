import { Schema, model } from 'mongoose';
const accountSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  type: { type: String, enum: ['CASH', 'BANK', 'UPI', 'CREDIT_CARD', 'WALLET', 'OTHER'], required: true },
  institution: { type: String, trim: true, maxlength: 100 },
  openingBalancePaise: { type: Number, default: 0, min: 0 },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
accountSchema.index({ ownerUserId: 1, name: 1 }, { unique: true });
export const Account = model('Account', accountSchema);
