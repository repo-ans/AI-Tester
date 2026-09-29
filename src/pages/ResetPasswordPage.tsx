import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/AuthCard';
import { PasswordForm } from '@/components/PasswordForm';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { initialUrlError } from '@/lib/supabase';

export function ResetPasswordPage() {
  const { session, recovery, finishRecovery } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // The email link signs the user in with a recovery session before this page renders.
  if (!session || !recovery) {
    return (
      <AuthCard
        title="Reset link not valid"
        subtitle={
          initialUrlError ??
          'This password reset link is invalid or has expired. Request a new one from the sign-in page.'
        }
      >
        <Link
          to="/login"
          className="flex h-9 w-full items-center justify-center rounded-lg bg-accent-600 text-sm font-medium text-white shadow-sm hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle={session.user.email ? `For ${session.user.email}` : 'Enter it twice to confirm.'}
    >
      <PasswordForm
        submitLabel="Save new password"
        onSuccess={() => {
          finishRecovery();
          toast.success('Password updated');
          navigate('/', { replace: true });
        }}
      />
    </AuthCard>
  );
}
