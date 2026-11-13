import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL } from '../../services/networkConfig';

export type ImportPreviewRow = { dedupeKey: string; amountPaise: number; type: 'DEBIT' | 'CREDIT'; merchant: string; category: string; occurredAt: string; source: 'CSV' | 'PDF'; upiRef?: string; note?: string };
export type ImportPreview = { batchId: string; fileName: string; fileType: 'CSV' | 'PDF'; detectedRows: number; duplicateInFile: number; skippedCount: number; preview: ImportPreviewRow[] };
export type ImportResult = { batchId: string; importedCount: number; duplicateCount: number; skippedCount: number; detectedRows: number };

async function upload(path: string, file: DocumentPicker.DocumentPickerAsset, getToken: () => Promise<string | null>) {
  const token = await getToken();
  if (!token) throw new Error('Sign in is required before importing statements.');
  const body = new FormData();
  body.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/csv') } as unknown as Blob);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body, signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as { data?: unknown; message?: string; error?: string };
    if (!response.ok) throw new Error(payload.message ?? payload.error ?? `Import failed (${response.status})`);
    return payload.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The statement upload timed out. Check your connection and try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the SpendSense server. Check your network connection.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function pickAndPreviewStatement(getToken: () => Promise<string | null>): Promise<ImportPreview | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
  if (picked.canceled || !picked.assets[0]) return null;
  return await upload('/api/import/preview', picked.assets[0], getToken) as ImportPreview;
}

export async function confirmStatementImport(batchId: string, getToken: () => Promise<string | null>): Promise<ImportResult> {
  const token = await getToken();
  if (!token) throw new Error('Sign in is required before confirming an import.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/import/${encodeURIComponent(batchId)}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as { data?: ImportResult; message?: string; error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.message ?? payload.error ?? `Import confirmation failed (${response.status})`);
    return payload.data;
  } finally { clearTimeout(timeout); }
}
