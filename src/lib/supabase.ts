import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Set when the Supabase env vars are missing, so the login page can say so. */
export const supabaseConfigError =
  url && anonKey
    ? null
    : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Read the URL before supabase-js consumes and clears it.
const hash = new URLSearchParams(window.location.hash.slice(1));
const search = new URLSearchParams(window.location.search);

/** Error Supabase put in the URL, e.g. an expired reset link. */
export const initialUrlError: string | null =
  hash.get('error_description') ?? search.get('error_description');

let recoveryFromUrl = hash.get('type') === 'recovery';

// Subscribe as early as possible: PASSWORD_RECOVERY can fire before React mounts.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') recoveryFromUrl = true;
});

export function arrivedFromRecoveryLink(): boolean {
  return recoveryFromUrl;
}

export function clearRecoveryFlag() {
  recoveryFromUrl = false;
}
