import { Schema, model } from 'mongoose';

const importBatchSchema = new Schema({
  ownerUserId: { type: String, required: true, index: true },
  fileName: { type: String, required: true, maxlength: 180 },
  fileType: { type: String, enum: ['CSV', 'PDF'], required: true },
  importedCount: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['PREVIEW', 'PROCESSING', 'COMPLETED'], default: 'COMPLETED' },
  rows: { type: [Schema.Types.Mixed], default: [] },
  detectedRows: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

export const ImportBatch = model('ImportBatch', importBatchSchema);
