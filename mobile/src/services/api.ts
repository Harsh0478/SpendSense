import { API_BASE_URL } from './networkConfig';

export interface TransactionInput {
  amountPaise: number;
  type: 'DEBIT' | 'CREDIT';
  merchant: string;
  category: string;
  accountId?: string;
  occurredAt: string;
  source?: 'MANUAL' | 'CSV' | 'PDF' | 'NOTIFICATION' | 'SMS';
  upiRef?: string;
  note?: string;
  tags?: string[];
  dedupeKey: string;
}

export interface TransactionRecord extends TransactionInput {
  _id: string;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiErrorShape { error?: string; message?: string }
export type TokenGetter = () => Promise<string | null>;

async function request<T>(path: string, getToken: TokenGetter, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as ApiErrorShape;
      if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (response.status === 409 && payload.error === 'DUPLICATE_TRANSACTION') throw new Error('This transaction has already been saved.');
      throw new Error(payload.message ?? payload.error ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The server took too long to respond. Check your connection and try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the SpendSense server. Check the API address and network connection.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type TransactionFilters = { type?: 'DEBIT' | 'CREDIT'; category?: string; q?: string; from?: string; to?: string; page?: number; limit?: number };

export function listTransactions(getToken: TokenGetter, filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return request<{ data: TransactionRecord[]; pagination?: { page: number; limit: number; total: number; pages: number } }>(`/api/transactions${params.size ? `?${params.toString()}` : ''}`, getToken);
}

export function createTransaction(input: TransactionInput, getToken: TokenGetter) {
  return request<{ data: TransactionRecord }>('/api/transactions', getToken, { method: 'POST', body: JSON.stringify(input) });
}

export function updateTransaction(id: string, input: Partial<TransactionInput>, getToken: TokenGetter) {
  return request<{ data: TransactionRecord }>(`/api/transactions/${encodeURIComponent(id)}`, getToken, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteTransaction(id: string, getToken: TokenGetter) {
  return request<void>(`/api/transactions/${encodeURIComponent(id)}`, getToken, { method: 'DELETE' });
}

/** Unique idempotency key for a manual entry. Repeated purchases can legitimately share all visible fields. */
export function createManualDedupeKey() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}
