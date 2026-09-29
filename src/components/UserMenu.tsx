import { useEffect, useId, useRef, useState } from 'react';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/format';

interface UserMenuProps {
  /** "sidebar" shows the email inline and opens upward; "compact" is an avatar that opens downward. */
  variant: 'sidebar' | 'compact';
}

export function UserMenu({ variant }: UserMenuProps) {
  const { email, signOut } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initial = (email ?? '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    toast.info('Signed out');
  }

  const avatar = (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
      {initial}
    </span>
  );

  return (
    <div ref={rootRef} className={cn('relative', variant === 'sidebar' && 'w-full')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={variant === 'compact' ? `Account: ${email ?? ''}` : undefined}
        className={cn(
          'flex items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
          variant === 'sidebar'
            ? 'w-full px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            : 'p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        )}
      >
        {avatar}
        {variant === 'sidebar' && (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
              {email}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-40 w-60 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900',
            variant === 'sidebar' ? 'bottom-full left-0 mb-1' : 'right-0 top-full mt-1',
          )}
        >
          <div className="px-2.5 py-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as</p>
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{email}</p>
          </div>
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            role="menuitem"
            autoFocus
            disabled={busy}
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none disabled:opacity-60 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
          >
            <LogOut className="size-4" aria-hidden />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
