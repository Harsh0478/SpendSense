import { API_BASE_URL } from './networkConfig';

export type AuthUser = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: AuthUser; isNewAccount?: boolean };

export class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'AuthRequestError'; }
}

async function readPayload<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: (T & { message?: string; error?: string }) | undefined;
  try {
    payload = raw ? JSON.parse(raw) as T & { message?: string; error?: string } : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message = payload?.message ?? payload?.error;
    throw new Error(message ?? `The server returned an invalid response (${response.status}).`);
  }
  if (!payload) throw new Error('The server returned an empty or invalid response. Check the backend logs.');
  return payload;
}

function isCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError'
    || error.name === 'CanceledError'
    || /aborted|aborterror|cancelled|canceled/i.test(error.message);
}

export async function authenticate(path: '/register' | '/login', body: Record<string, string>): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutMs = path === '/register' ? 45_000 : 25_000;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await readPayload<AuthResponse>(response);
  } catch (error) {
    if (timedOut) {
      const action = path === '/register'
        ? 'Your account may have been created. Try signing in before attempting registration again.'
        : 'Please try signing in again.';
      throw new Error(`The ${path === '/register' ? 'registration' : 'login'} request timed out after ${Math.round(timeoutMs / 1000)} seconds. Check the phone's API address and make sure the backend is running. ${action}`);
    }
    if (isCancellation(error)) {
      throw new Error('The connection was cancelled before the server responded. Keep the app open and try again. If this repeats, check the phone-to-computer network connection.');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach the SpendSense server. Check EXPO_PUBLIC_API_BASE_URL, Wi-Fi, and the Windows firewall.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 401) throw new AuthRequestError('AUTH_UNAUTHORIZED', 401);
    const payload = await readPayload<{ data: AuthUser }>(response);
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}
