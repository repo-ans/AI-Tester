import type { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AuthCardProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered logo + title + card, shared by the login and reset-password screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm">
            <FlaskConical className="size-5" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <Card className="p-5">{children}</Card>
        {footer && (
          <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{footer}</div>
        )}
      </div>
    </div>
  );
}
