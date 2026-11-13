import { API_BASE_URL } from '../../services/networkConfig';

type TokenGetter = () => Promise<string | null>;
type ApiPayload = { data?: unknown; message?: string; error?: string };

async function request<T>(path: string, getToken: TokenGetter, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Sign in is required to use SpendSense AI.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as ApiPayload;
    if (!response.ok) throw new Error(payload.message ?? payload.error ?? `AI request failed (${response.status}).`);
    return payload.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('SpendSense AI took too long to respond. Please try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the SpendSense server. Check your network connection.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const categorizeTransaction = (input: { merchant: string; amountPaise: number; type: 'DEBIT' | 'CREDIT' }, getToken: TokenGetter) =>
  request<{ category: string; confidence: number; reason: string }>('/api/ai/categorize', getToken, { method: 'POST', body: JSON.stringify(input) });

export const askSpendSense = (message: string, getToken: TokenGetter) =>
  request<{ answer: string }>('/api/ai/chat', getToken, { method: 'POST', body: JSON.stringify({ message }) });

export const getAiInsights = (getToken: TokenGetter) =>
  request<{ summary: unknown; insights: string[] }>('/api/ai/insights', getToken);

export const getRecurringCandidates = (getToken: TokenGetter) =>
  request<Array<{ merchant: string; category: string; occurrences: number; averagePaise: number; lastSeen: string }>>('/api/ai/recurring', getToken);

export interface SpendingAnomaly { category:string; currentMonthPaise:number; projectedMonthPaise:number; priorThreeMonthAveragePaise:number; increasePercent:number; message:string }
export const getUnusualSpending=(getToken:TokenGetter)=>request<{currentMonth:string;anomalies:SpendingAnomaly[];baselineMonths:string[]}>('/api/ai/unusual-spending',getToken);
