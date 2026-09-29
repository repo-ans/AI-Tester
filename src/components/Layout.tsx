import { NavLink, Outlet } from 'react-router-dom';
import {
  FlaskConical,
  Library,
  ListChecks,
  Monitor,
  Moon,
  Play,
  Settings,
  Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { UserMenu } from '@/components/UserMenu';
import { cn } from '@/lib/format';
import { useTheme, type ThemePref } from '@/lib/theme';

const NAV: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: '/run', label: 'Run test', icon: <Play className="size-4" aria-hidden /> },
  { to: '/tests', label: 'Results', icon: <ListChecks className="size-4" aria-hidden /> },
  { to: '/scenarios', label: 'Scenarios', icon: <Library className="size-4" aria-hidden /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="size-4" aria-hidden /> },
];

const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };

function ThemeButton() {
  const [theme, setTheme] = useTheme();
  const icon =
    theme === 'light' ? (
      <Sun className="size-4" />
    ) : theme === 'dark' ? (
      <Moon className="size-4" />
    ) : (
      <Monitor className="size-4" />
    );
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT_THEME[theme])}
      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
      title={`Theme: ${theme}`}
    >
      {icon}
    </button>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent-600 text-white">
        <FlaskConical className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        AI Bot Tester
      </span>
    </div>
  );
}

export function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="flex h-14 items-center px-4">
          <Brand />
        </div>
        <nav aria-label="Main" className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                  isActive
                    ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <UserMenu variant="sidebar" />
          </div>
          <ThemeButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeButton />
          <UserMenu variant="compact" />
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-900 md:hidden"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500',
                isActive
                  ? 'text-accent-600 dark:text-accent-400'
                  : 'text-zinc-500 dark:text-zinc-400',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
