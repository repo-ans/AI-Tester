import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type {
  ApiAction,
  ApiActions,
  Channel,
  Message,
  Scenario,
  Session,
  SessionRow,
  StartTestInput,
  StartTestResult,
} from './types';

export * from './types';

/** n8n webhook base, e.g. https://n8n.example.com/webhook */
const N8N_WEBHOOK_URL = (import.meta.env.VITE_N8N_WEBHOOK_URL ?? '').replace(/\/+$/, '');

const CHANNEL_NAME: Record<Channel, string> = { sms: 'SMS', voice: 'voice', chat: 'website chat' };

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

const SETUP_HINT = 'Run supabase/dashboard.sql in the Supabase SQL editor.';

/** Turns a Supabase/PostgREST error into a readable ApiError. */
function dbError(error: PostgrestError): ApiError {
  if (error.code === 'PGRST301' || error.code === 'PGRST303' || /jwt/i.test(error.message)) {
    return new ApiError('unauthorized');
  }
  if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST202') {
    return new ApiError(`The database is missing dashboard tables. ${SETUP_HINT}`);
  }
  if (error.code === '42501') {
    return new ApiError(`Permission denied by the database. ${SETUP_HINT}`);
  }
  return new ApiError(error.message || 'Database error');
}

function unwrap<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw dbError(res.error);
  return res.data;
}

// ---------- start_test → n8n channel webhook ----------

function startBody(input: StartTestInput): Record<string, unknown> {
  // The channel workflows expect the target fields at the top level.
  return { ...input.target, scenario: input.scenario };
}

async function startTest(input: StartTestInput): Promise<StartTestResult> {
  if (!N8N_WEBHOOK_URL)
    throw new ApiError('VITE_N8N_WEBHOOK_URL is not set. Add it to your .env file.');
  const url = `${N8N_WEBHOOK_URL}/ai-tester/${input.channel}/start`;
  const name = CHANNEL_NAME[input.channel];

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(startBody(input)),
    });
  } catch {
    throw new ApiError(
      `Could not reach the ${name} test workflow in n8n. Check that it exists, is active, and allows this site under Allowed Origins (CORS).`,
    );
  }
  if (res.status === 404) {
    throw new ApiError(`The ${name} test workflow isn't active in n8n (webhook not found).`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // An empty reply usually means the workflow hit an error before its
    // "Respond" node (e.g. the Retell call couldn't be created).
    throw new ApiError(
      `The ${name} workflow stopped before replying (HTTP ${res.status}). Open its latest execution in n8n to see which step failed. The test may show as "Running" on the Results page; stop it there.`,
    );
  }
  if (!res.ok) {
    const msg = typeof body === 'object' && body && 'message' in body ? String(body.message) : '';
    throw new ApiError(msg || `The ${name} workflow failed (HTTP ${res.status}).`);
  }
  const id =
    typeof body === 'object' && body && 'session_id' in body ? Number(body.session_id) : NaN;
  if (!Number.isFinite(id)) throw new ApiError(`The ${name} workflow didn't return a session id.`);
  return { ...(body as StartTestResult), session_id: id };
}

// ---------- Action handlers ----------

type Handlers = {
  [A in ApiAction]: (payload: ApiActions[A]['req']) => Promise<ApiActions[A]['res']>;
};

const SESSION_COLUMNS =
  'id, channel, status, turns, scenario, result, tester_number, bot_number, external_ref, created_at, finished_at';
const SCENARIO_COLUMNS =
  'id, channel, name, persona, goal, checks, max_turns, bot_starts, created_at, updated_at';

const handlers: Handlers = {
  async list_sessions({ channel, limit }) {
    let q = supabase
      .from('ai_test_session_list')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit ?? 200);
    if (channel) q = q.eq('channel', channel);
    const rows = unwrap(await q) as SessionRow[];
    return rows.map((r) => ({ ...r, score: r.score === null ? null : Number(r.score) }));
  },

  async get_session({ id }) {
    const [s, m] = await Promise.all([
      supabase.from('ai_test_sessions').select(SESSION_COLUMNS).eq('id', id).maybeSingle(),
      supabase
        .from('ai_test_messages')
        .select('role, content, created_at')
        .eq('session_id', id)
        .order('id', { ascending: true }),
    ]);
    const session = unwrap(s) as Session | null;
    if (!session) return null;
    const rows = unwrap(m) as Array<{ role: Message['role']; content: string; created_at: string }>;
    return {
      session: { ...session, scenario: session.scenario ?? {} },
      messages: rows.map((r) => ({ role: r.role, content: r.content, at: r.created_at })),
    };
  },

  async abort_session({ id }) {
    const n = unwrap(await supabase.rpc('abort_test_session', { p_id: id })) as number;
    return { aborted: n > 0 ? 1 : 0 };
  },

  start_test: startTest,

  async list_scenarios() {
    const res = await supabase
      .from('ai_test_scenarios')
      .select(SCENARIO_COLUMNS)
      .order('name', { ascending: true });
    return unwrap(res) as Scenario[];
  },

  async save_scenario({ scenario }) {
    const { id, ...fields } = scenario;
    const res = id
      ? await supabase
          .from('ai_test_scenarios')
          .update(fields)
          .eq('id', id)
          .select(SCENARIO_COLUMNS)
          .maybeSingle()
      : await supabase.from('ai_test_scenarios').insert(fields).select(SCENARIO_COLUMNS).single();
    return unwrap(res) as Scenario | null;
  },

  async delete_scenario({ id }) {
    const res = await supabase.from('ai_test_scenarios').delete().eq('id', id).select('id');
    const rows = unwrap(res) as Array<{ id: number }>;
    return { deleted: rows.length > 0 ? 1 : 0 };
  },
};

// Parallel calls that all hit "unauthorized" share a single refresh.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= supabase.auth
    .refreshSession()
    .then(({ data }) => Boolean(data.session))
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Runs a dashboard action. Reads and writes go straight to Supabase (protected
 * by row-level security); starting a test calls the channel's n8n webhook.
 * On "unauthorized" the session is refreshed once and the call retried.
 */
export async function api<A extends ApiAction>(
  action: A,
  ...args: ApiActions[A]['req'] extends Record<string, never>
    ? [payload?: ApiActions[A]['req']]
    : [payload: ApiActions[A]['req']]
): Promise<ApiActions[A]['res']> {
  const payload = (args[0] ?? {}) as ApiActions[A]['req'];
  const run = handlers[action] as (p: ApiActions[A]['req']) => Promise<ApiActions[A]['res']>;
  try {
    return await run(payload);
  } catch (err) {
    if (err instanceof ApiError) {
      if (!err.unauthorized || !(await refreshSession())) throw err;
      return run(payload);
    }
    // Network failures from supabase-js surface as TypeErrors.
    throw new ApiError(err instanceof Error ? err.message : 'Something went wrong');
  }
}
