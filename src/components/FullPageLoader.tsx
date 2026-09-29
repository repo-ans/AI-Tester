import { Loader2 } from 'lucide-react';

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Loader2 className="size-6 animate-spin text-accent-500" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
