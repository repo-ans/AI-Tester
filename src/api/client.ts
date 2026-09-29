import { supabase } from '@/lib/supabase';
import type { ApiAction, ApiActions } from './types';

export * from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  readonly unauthorized: boolean;
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
    this.unauthorized = message === 'unauthorized';
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.unauthorized;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

async function currentToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// Parallel requests that all hit "unauthorized" share a single refresh.
let refreshing: Promise<string | null> | null = null;

function refreshToken(): Promise<string | null> {
  refreshing ??= supabase.auth
    .refreshSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(action: ApiAction, payload: object | undefined, token: string | null) {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, ...(payload ?? {}) }),
    });
  } catch {
    throw new ApiError('Network error — could not reach the API (check the URL and CORS).');
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    if (res.status === 401 || res.status === 403) throw new ApiError('unauthorized');
    throw new ApiError(`Unexpected response from the API (HTTP ${res.status}).`);
  }

  if (!isEnvelope(body)) throw new ApiError('Unexpected response from the API.');
  if (!body.ok) throw new ApiError(body.error || 'Unknown API error');
  return body.data;
}

/**
 * Calls the n8n Dashboard API with the signed-in user's Supabase token.
 * On "unauthorized" the session is refreshed once and the call retried;
 * a second failure is thrown so the app can sign the user out.
 */
export async function api<A extends ApiAction>(
  action: A,
  ...args: ApiActions[A]['req'] extends Record<string, never>
    ? [payload?: ApiActions[A]['req']]
    : [payload: ApiActions[A]['req']]
): Promise<ApiActions[A]['res']> {
  const [payload] = args;
  if (!API_URL) throw new ApiError('VITE_API_URL is not set. Add it to your .env file.');

  try {
    return (await send(action, payload, await currentToken())) as ApiActions[A]['res'];
  } catch (err) {
    if (!isUnauthorized(err)) throw err;
    const fresh = await refreshToken();
    if (!fresh) throw err;
    return (await send(action, payload, fresh)) as ApiActions[A]['res'];
  }
}
