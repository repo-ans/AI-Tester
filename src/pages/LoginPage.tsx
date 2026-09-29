import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, MailCheck } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigError } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fromPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === 'string' && from !== '/login') return from;
  }
  return '/';
}

export function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(supabaseConfigError ?? undefined);
  const [emailError, setEmailError] = useState<string>();
  const [resetSentTo, setResetSentTo] = useState<string>();
  const [busy, setBusy] = useState<'login' | 'reset' | null>(null);

  if (session) return <Navigate to={fromPath(location.state)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setEmailError(undefined);
    if (!EMAIL.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    setBusy('login');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(null);
    if (authError) {
      setError(authError.message);
      return;
    }
    toast.success('Signed in');
    navigate(fromPath(location.state), { replace: true });
  }

  async function forgotPassword() {
    setError(undefined);
    setResetSentTo(undefined);
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setEmailError('Enter your email above first, then click “Forgot password?”');
      return;
    }
    setEmailError(undefined);
    setBusy('reset');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(null);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSentTo(address);
  }

  return (
    <AuthCard
      title="AI Bot Tester"
      subtitle="Test your clients' SMS, voice and chat bots with an AI customer."
      footer="No account? Ask your admin to add you."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Field label="Email" error={emailError}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="login-password"
              className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => void forgotPassword()}
              disabled={busy !== null}
              className="rounded text-xs font-medium text-accent-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-60 dark:text-accent-400"
            >
              {busy === 'reset' ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {resetSentTo && (
          <p
            role="status"
            className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              If an account exists for <strong className="font-medium">{resetSentTo}</strong>, a
              reset link is on its way. Check your inbox.
            </span>
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={busy === 'login'}
          disabled={busy === 'reset' || Boolean(supabaseConfigError)}
          icon={<LogIn className="size-4" aria-hidden />}
        >
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
