import { Schema, model } from 'mongoose';
const categorySchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: ['DEBIT', 'CREDIT', 'BOTH'], default: 'BOTH' },
  icon: { type: String, maxlength: 40, default: 'tag' },
  color: { type: String, maxlength: 20, default: '#8B7CF6' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
categorySchema.index({ ownerUserId: 1, name: 1 }, { unique: true });
export const CategoryModel = model('Category', categorySchema);
