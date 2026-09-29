import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/format';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Lets non-React code (the QueryClient error handler) raise toasts.
let externalPush: ((kind: ToastKind, message: string) => void) | null = null;
export const toast: ToastApi = {
  success: (m) => externalPush?.('success', m),
  error: (m) => externalPush?.('error', m),
  info: (m) => externalPush?.('info', m),
};

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />,
  error: <XCircle className="size-4 text-red-500" aria-hidden />,
  info: <Info className="size-4 text-accent-500" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setItems((list) => {
        // Don't stack identical messages (e.g. a failing poll).
        if (list.some((t) => t.kind === kind && t.message === message)) return list;
        return [...list.slice(-3), { id, kind, message }];
      });
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-white px-3.5 py-3 text-sm shadow-lg dark:bg-zinc-900',
              t.kind === 'error'
                ? 'border-red-200 dark:border-red-500/30'
                : 'border-zinc-200 dark:border-zinc-700',
            )}
          >
            <span className="mt-0.5">{ICONS[t.kind]}</span>
            <p className="min-w-0 flex-1 break-words text-zinc-800 dark:text-zinc-100">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:text-zinc-200"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
