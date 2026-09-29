import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Inbox, Play, RefreshCw, Search, SearchX } from 'lucide-react';
import type { Channel, SessionRow, Status } from '@/api/client';
import { useSessions } from '@/api/hooks';
import { ChannelChip, Score, StatusBadge } from '@/components/badges';
import { PageHeader } from '@/components/Layout';
import { ScoreTrend } from '@/components/ScoreTrend';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { CHANNEL_LABEL, cn, fullDate, relativeTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';

interface Filters {
  channel: '' | Channel;
  status: '' | Status;
  q: string;
  from: string;
  to: string;
}

const NO_FILTERS: Filters = { channel: '', status: '', q: '', from: '', to: '' };

function applyFilters(rows: SessionRow[], f: Filters): SessionRow[] {
  const q = f.q.trim().toLowerCase();
  const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (q && !`${r.name ?? ''} ${r.bot_number} #${r.id}`.toLowerCase().includes(q)) return false;
    const t = new Date(r.created_at).getTime();
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    return true;
  });
}

export function ResultsPage() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const { data, isLoading, isFetching, refetch } = useSessions(filters.channel);
  const rows = useMemo(() => applyFilters(data ?? [], filters), [data, filters]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const anyRunning = data?.some((r) => r.status === 'running');

  return (
    <>
      <PageHeader
        title="Results"
        description={
          anyRunning
            ? 'Tests are running — this page refreshes every 5 seconds.'
            : 'Every test run, newest first.'
        }
        actions={
          <>
            <Button
              icon={
                <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} aria-hidden />
              }
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Link
              to="/run"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <Play className="size-4" aria-hidden />
              New test
            </Link>
          </>
        }
      />

      <Stats rows={rows} loading={isLoading} />

      <Card className="mt-4">
        <CardHeader
          title="Score trend"
          description="Last 30 finished tests matching your filters. Click a point to open it."
        />
        <div className="py-3">
          {isLoading ? <Skeleton className="mx-4 h-[140px]" /> : <ScoreTrend rows={rows} />}
        </div>
      </Card>

      <Card className="mt-4">
        <FilterBar
          filters={filters}
          set={set}
          onReset={hasFilters ? () => setFilters(NO_FILTERS) : undefined}
        />
        {isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchX className="size-5" aria-hidden />}
              title="No tests match these filters"
              action={<Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              icon={<Inbox className="size-5" aria-hidden />}
              title="No tests yet"
              description="Start your first test and the AI customer will talk to your bot."
              action={
                <Link
                  to="/run"
                  className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
                >
                  Run a test →
                </Link>
              }
            />
          )
        ) : (
          <SessionList rows={rows} />
        )}
      </Card>
    </>
  );
}

// ---------- Stats ----------

function Stats({ rows, loading }: { rows: SessionRow[]; loading: boolean }) {
  const passed = rows.filter((r) => r.status === 'passed').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const scored = rows.filter((r) => r.score !== null);
  const avg = scored.length ? scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length : null;
  const running = rows.filter((r) => r.status === 'running').length;
  const graded = passed + failed;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Total tests" loading={loading} value={rows.length} />
      <StatCard
        label="Pass rate"
        loading={loading}
        value={graded ? `${Math.round((passed / graded) * 100)}%` : '—'}
        sub={graded ? `${passed} of ${graded} graded` : 'No graded tests'}
      />
      <StatCard
        label="Average score"
        loading={loading}
        value={avg === null ? '—' : <Score score={avg} />}
        sub={scored.length ? `across ${scored.length} tests` : undefined}
      />
      <StatCard
        label="Running now"
        loading={loading}
        value={
          <span className="inline-flex items-center gap-2">
            {running}
            {running > 0 && (
              <Activity className="size-4 animate-pulse text-accent-500" aria-hidden />
            )}
          </span>
        }
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  loading: boolean;
}) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      )}
      {sub && !loading && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </Card>
  );
}

// ---------- Filters ----------

interface FilterBarProps {
  filters: Filters;
  set: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  onReset?: () => void;
}

function FilterBar({ filters, set, onReset }: FilterBarProps) {
  return (
    <div className="grid gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_9rem_9rem_9rem_auto]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <Input
          aria-label="Search by test name or bot number"
          placeholder="Search name or bot number"
          className="pl-8"
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
        />
      </div>
      <Select
        aria-label="Channel"
        value={filters.channel}
        onChange={(e) => set('channel', e.target.value as Filters['channel'])}
      >
        <option value="">All channels</option>
        {(['sms', 'voice', 'chat'] as const).map((c) => (
          <option key={c} value={c}>
            {CHANNEL_LABEL[c]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Status"
        value={filters.status}
        onChange={(e) => set('status', e.target.value as Filters['status'])}
      >
        <option value="">All statuses</option>
        <option value="running">Running</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="aborted">Stopped</option>
      </Select>
      <Input
        type="date"
        aria-label="From date"
        title="From date"
        value={filters.from}
        onChange={(e) => set('from', e.target.value)}
      />
      <Input
        type="date"
        aria-label="To date"
        title="To date"
        value={filters.to}
        onChange={(e) => set('to', e.target.value)}
      />
      {onReset ? (
        <Button variant="ghost" onClick={onReset}>
          Clear
        </Button>
      ) : (
        <span className="hidden lg:block" />
      )}
    </div>
  );
}

// ---------- List ----------

function SessionList({ rows }: { rows: SessionRow[] }) {
  const navigate = useNavigate();
  const now = useNow();

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="w-16 px-4 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Test
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Channel
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">
                Score
              </th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">
                Msgs
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Started
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => navigate(`/tests/${r.id}`)}
                className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 tabular-nums text-zinc-500">{r.id}</td>
                <td className="max-w-0 px-2 py-3">
                  {/* Real link keeps rows keyboard- and middle-click-friendly */}
                  <Link
                    to={`/tests/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate font-medium text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:text-zinc-100"
                  >
                    {r.name || 'Untitled test'}
                  </Link>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {r.bot_number}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <ChannelChip channel={r.channel} />
                </td>
                <td className="px-2 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-3 text-right">
                  <Score score={r.score} />
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                  {r.messages}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                  <time dateTime={r.created_at} title={fullDate(r.created_at)}>
                    {relativeTime(r.created_at, now)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={`/tests/${r.id}`}
              className="block px-4 py-3 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-zinc-800/40 dark:focus-visible:bg-zinc-800/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <span className="mr-1 text-zinc-400">#{r.id}</span>
                    {r.name || 'Untitled test'}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {r.bot_number}
                  </p>
                </div>
                <Score score={r.score} className="text-lg" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <ChannelChip channel={r.channel} />
                <StatusBadge status={r.status} />
                <span>· {r.messages} msgs ·</span>
                <time dateTime={r.created_at} title={fullDate(r.created_at)}>
                  {relativeTime(r.created_at, now)}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading tests">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-10" />
        </div>
      ))}
    </div>
  );
}
