import { parse } from 'csv-parse/sync';
import { transactionDedupeKey } from './dedupe.js';

export type ParsedImportTransaction = {
  amountPaise: number; type: 'DEBIT' | 'CREDIT'; merchant: string; category: string;
  occurredAt: string; source: 'CSV' | 'PDF' | 'SMS'; upiRef?: string; note?: string; tags: string[]; dedupeKey: string;
};
const dateValue = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  // Indian bank exports commonly use DD/MM/YYYY or DD-MM-YYYY.
  const localDate = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (localDate) {
    const dayText = localDate[1]; const monthText = localDate[2]; const yearText = localDate[3];
    if (!dayText || !monthText || !yearText) return null;
    const day = Number(dayText); const month = Number(monthText); const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
    return parsed.toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const amountPaise = (value: unknown) => {
  const n = Number(String(value ?? '').replace(/[₹,\s]/g, '').replace(/[()]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const pick = (row: Record<string, unknown>, names: string[]) => {
  const entries = Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[^a-z]/g, ''), v] as const);
  for (const name of names) { const found = entries.find(([key]) => key === name); if (found) return found[1]; }
  return undefined;
};
function finalize(row: { amount: unknown; type?: unknown; merchant: unknown; date: unknown; category?: unknown; upiRef?: unknown; note?: unknown }, source: 'CSV' | 'PDF' | 'SMS'): ParsedImportTransaction | null {
  const amount = amountPaise(row.amount); const merchant = String(row.merchant ?? '').trim(); const occurredAt = dateValue(row.date);
  if (!amount || !merchant || !occurredAt) return null;
  const typeText = String(row.type ?? '').toLowerCase();
  const type: 'DEBIT' | 'CREDIT' = /credit|cr|deposit|received|salary|refund/.test(typeText) ? 'CREDIT' : 'DEBIT';
  const item = { amountPaise: amount, type, merchant: merchant.slice(0, 120), category: String(row.category ?? 'Other').slice(0, 60), occurredAt, source, upiRef: row.upiRef ? String(row.upiRef).slice(0, 40) : undefined, note: row.note ? String(row.note).slice(0, 500) : undefined, tags: [] as string[] };
  return { ...item, dedupeKey: transactionDedupeKey(item) };
}
export function parseCsvTransactions(buffer: Buffer) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, bom: true, trim: true, relax_column_count: true, max_record_size: 20_000 }) as Record<string, unknown>[];
  if (rows.length > 5000) throw new Error('CSV_LIMIT_EXCEEDED');
  const parsed: ParsedImportTransaction[] = []; let skipped = 0;
  for (const row of rows) {
    const debitValue = pick(row, ['debit', 'debitamount', 'withdrawal']);
    const creditValue = pick(row, ['credit', 'creditamount', 'deposit']);
    const hasDebitCreditColumns = debitValue !== undefined || creditValue !== undefined;
    const debitAmount = amountPaise(debitValue); const creditAmount = amountPaise(creditValue);
    const amount = hasDebitCreditColumns ? (debitAmount || creditAmount) / 100 : pick(row, ['amount', 'transactionamount']);
    const type = hasDebitCreditColumns ? (creditAmount > 0 ? 'CREDIT' : 'DEBIT') : pick(row, ['type', 'transactiontype', 'drcr', 'transaction']);
    const value = finalize({ amount, type, merchant: pick(row, ['merchant', 'description', 'narration', 'payee', 'name']), date: pick(row, ['date', 'transactiondate', 'valuedate']), category: pick(row, ['category']), upiRef: pick(row, ['upiref', 'referenceno', 'utr']), note: pick(row, ['note', 'remarks']) }, 'CSV');
    if (value) parsed.push(value); else skipped++;
  }
  return { parsed, skipped };
}
export function parseStatementText(text: string, source: 'PDF' | 'SMS' = 'PDF') {
  const parsed: ParsedImportTransaction[] = []; let skipped = 0;
  // Conservative generic statement row: date, description, debit/credit/amount.
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s*(DR|CR|DEBIT|CREDIT)?\s*$/i);
    if (!match) continue;
    const rawDate = match[1];
    const merchant = match[2];
    const amount = match[3];
    if (!rawDate || !merchant || !amount) { skipped++; continue; }
    let date = rawDate;
    if (!(rawDate.includes('-') && rawDate.length === 10)) {
      const parts = rawDate.split(/[\\/.-]/);
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      if (!day || !month || !year) { skipped++; continue; }
      const fullYear = year.length === 2 ? `20${year}` : year;
      const dayNumber = Number(day); const monthNumber = Number(month); const yearNumber = Number(fullYear);
      const checked = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
      if (checked.getUTCFullYear() !== yearNumber || checked.getUTCMonth() !== monthNumber - 1 || checked.getUTCDate() !== dayNumber) { skipped++; continue; }
      date = checked.toISOString();
    }
    const item = finalize({ date, merchant, amount, type: match[4] }, source);
    if (item) parsed.push(item); else skipped++;
  }
  return { parsed, skipped };
}