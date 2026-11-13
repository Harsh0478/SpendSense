import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { Transaction } from '../models/Transaction.js';
import { ImportBatch } from '../models/ImportBatch.js';
import type { AuthenticatedRequest } from '../middleware/requireAuth.js';
import { parseCsvTransactions, parseStatementText } from '../services/importParser.js';

export const importRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

function parseStatementFile(file: Express.Multer.File) {
  const safeName = file.originalname.replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f]/g, '').slice(0, 180);
  const ext = safeName.toLowerCase().split('.').pop();
  if (ext === 'csv' || file.mimetype === 'text/csv') return { parsed: parseCsvTransactions(file.buffer), fileType: 'CSV' as const, safeName };
  if (ext === 'pdf' || file.mimetype === 'application/pdf') return { parsed: null as ReturnType<typeof parseStatementText> | null, fileType: 'PDF' as const, safeName, pdfBuffer: file.buffer };
  throw Object.assign(new Error('UNSUPPORTED_FILE'), { status: 415 });
}

async function resolveParsedFile(file: Express.Multer.File) {
  const result = parseStatementFile(file);
  if (result.fileType === 'CSV') return result;
  const pdfResult = await pdf(result.pdfBuffer!);
  return { parsed: parseStatementText(pdfResult.text, 'PDF'), fileType: 'PDF' as const, safeName: result.safeName };
}

importRouter.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED' });
    const { parsed, fileType, safeName } = await resolveParsedFile(req.file);
    if (parsed.parsed.length > 5000) return res.status(413).json({ error: 'IMPORT_LIMIT' });
    if (!parsed.parsed.length) return res.status(422).json({ error: 'NO_TRANSACTIONS_FOUND', message: 'No supported transaction rows were found in this file.' });
    const uniqueRows = Array.from(new Map(parsed.parsed.map((row) => [row.dedupeKey, row])).values());
    const duplicateInFile = parsed.parsed.length - uniqueRows.length;
    const batch = await ImportBatch.create({
      ownerUserId: userId, fileName: safeName, fileType, status: 'PREVIEW', rows: uniqueRows, detectedRows: parsed.parsed.length,
      importedCount: 0, duplicateCount: duplicateInFile, skippedCount: parsed.skipped,
    });
    return res.status(201).json({ data: {
      batchId: batch.id, fileName: safeName, fileType, detectedRows: parsed.parsed.length, duplicateInFile,
      skippedCount: parsed.skipped, preview: parsed.parsed.slice(0, 100),
    } });
  } catch (error) {
    if (error instanceof Error && error.message === 'CSV_LIMIT_EXCEEDED') return res.status(413).json({ error: 'IMPORT_LIMIT' });
    return next(error);
  }
});

importRouter.post('/:batchId/confirm', async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!;
    const batch = await ImportBatch.findOneAndUpdate(
      { _id: req.params.batchId, ownerUserId: userId, status: 'PREVIEW' },
      { $set: { status: 'PROCESSING' } }, { new: true },
    );
    if (!batch) return res.status(404).json({ error: 'PREVIEW_NOT_FOUND', message: 'This import preview is missing, expired, or already confirmed.' });
    try {
      const rows = batch.rows as Array<Record<string, unknown>>;
      const ops = rows.map((item) => ({ updateOne: {
        filter: { ownerUserId: userId, dedupeKey: String(item.dedupeKey) },
        update: { $setOnInsert: { ...item, ownerUserId: userId } }, upsert: true,
      } }));
      const result = ops.length ? await Transaction.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0, matchedCount: 0 };
      batch.importedCount = result.upsertedCount ?? 0;
      batch.duplicateCount = (batch.duplicateCount ?? 0) + (result.matchedCount ?? 0);
      batch.status = 'COMPLETED';
      batch.rows = [];
      await batch.save();
      return res.json({ data: { batchId: batch.id, importedCount: batch.importedCount, duplicateCount: batch.duplicateCount, skippedCount: batch.skippedCount, detectedRows: batch.detectedRows } });
    } catch (error) {
      batch.status = 'PREVIEW';
      await batch.save().catch(() => undefined);
      throw error;
    }
  } catch (error) { return next(error); }
});
importRouter.post('/statement', upload.single('file'), async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId!; const file = req.file;
    if (!file) return res.status(400).json({ error: 'FILE_REQUIRED' });
    const safeName = file.originalname.replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f]/g, '').slice(0, 180);
    const ext = safeName.toLowerCase().split('.').pop();
    let parsed: ReturnType<typeof parseStatementText>;
    let fileType: 'CSV' | 'PDF';
    if (ext === 'csv' || file.mimetype === 'text/csv') { parsed = parseCsvTransactions(file.buffer); fileType = 'CSV'; }
    else if (ext === 'pdf' || file.mimetype === 'application/pdf') { const result = await pdf(file.buffer); parsed = parseStatementText(result.text, 'PDF'); fileType = 'PDF'; }
    else return res.status(415).json({ error: 'UNSUPPORTED_FILE', message: 'Upload a CSV or text-based PDF statement.' });
    if (parsed.parsed.length > 5000) return res.status(413).json({ error: 'IMPORT_LIMIT' });
    const ops = parsed.parsed.map((item) => ({ updateOne: { filter: { ownerUserId: userId, dedupeKey: item.dedupeKey }, update: { $setOnInsert: { ...item, ownerUserId: userId } }, upsert: true } }));
    const result = ops.length ? await Transaction.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0, matchedCount: 0 };
    const importedCount = result.upsertedCount ?? 0; const duplicateCount = result.matchedCount ?? 0;
    const batch = await ImportBatch.create({ ownerUserId: userId, fileName: safeName, fileType, importedCount, duplicateCount, skippedCount: parsed.skipped });
    return res.status(201).json({ data: { batchId: batch.id, importedCount, duplicateCount, skippedCount: parsed.skipped, detectedRows: parsed.parsed.length } });
  } catch (error) { if (error instanceof Error && error.message === 'CSV_LIMIT_EXCEEDED') return res.status(413).json({ error: 'IMPORT_LIMIT' }); return next(error); }
});
