import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Pencil, Play, Plus, Search, SearchX, Trash2 } from 'lucide-react';
import type { Scenario } from '@/api/client';
import { useDeleteScenario, useScenarios } from '@/api/hooks';
import { ChannelChip } from '@/components/badges';
import { PageHeader } from '@/components/Layout';
import { ScenarioModal } from '@/components/ScenarioModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { RunPrefill } from '@/lib/prefill';

type ModalState = { open: false } | { open: true; scenario: Scenario | null };

export function ScenariosPage() {
  const { data, isLoading } = useScenarios();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [toDelete, setToDelete] = useState<Scenario | null>(null);
  const del = useDeleteScenario();
  const toast = useToast();
  const navigate = useNavigate();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = data ?? [];
    if (!term) return all;
    return all.filter((s) => `${s.name} ${s.persona} ${s.goal}`.toLowerCase().includes(term));
  }, [data, q]);

  function use(s: Scenario) {
    const prefill: RunPrefill = {
      ...(s.channel === 'any' ? {} : { channel: s.channel }),
      scenario: s,
    };
    navigate('/run', { state: { prefill } });
  }

  function confirmDelete() {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: (res) => {
        toast.success(res.deleted ? `Deleted "${toDelete.name}"` : 'Scenario was already deleted');
        setToDelete(null);
      },
    });
  }

  const newButton = (
    <Button
      variant="primary"
      icon={<Plus className="size-4" aria-hidden />}
      onClick={() => setModal({ open: true, scenario: null })}
    >
      New scenario
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Scenarios"
        description="Reusable scripts for the AI customer."
        actions={newButton}
      />

      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <Input
          aria-label="Search scenarios"
          placeholder="Search scenarios"
          className="pl-8"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          {q ? (
            <EmptyState
              icon={<SearchX className="size-5" aria-hidden />}
              title="No scenarios match your search"
              action={<Button onClick={() => setQ('')}>Clear search</Button>}
            />
          ) : (
            <EmptyState
              icon={<Library className="size-5" aria-hidden />}
              title="No scenarios yet"
              description="Save a scenario once and reuse it for every client bot."
              action={newButton}
            />
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <ScenarioCard
                scenario={s}
                onUse={() => use(s)}
                onEdit={() => setModal({ open: true, scenario: s })}
                onDelete={() => setToDelete(s)}
              />
            </li>
          ))}
        </ul>
      )}

      <ScenarioModal
        open={modal.open}
        scenario={modal.open ? modal.scenario : null}
        onClose={() => setModal({ open: false })}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete scenario?"
        message={
          <>
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              {toDelete?.name}
            </strong>{' '}
            will be deleted. Past test results are not affected.
          </>
        }
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

interface CardProps {
  scenario: Scenario;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ScenarioCard({ scenario: s, onUse, onEdit, onDelete }: CardProps) {
  const checks = s.checks.length;
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <ChannelChip channel={s.channel} />
        <div className="-mr-1.5 -mt-1 flex">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${s.name}`}
            title="Edit"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${s.name}`}
            title="Delete"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <h2 className="mt-2 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {s.name}
      </h2>
      <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{s.persona}</p>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-200">
        <span className="font-medium">Goal: </span>
        {s.goal}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {checks} {checks === 1 ? 'check' : 'checks'} · {s.max_turns} msgs
          {s.bot_starts && ' · bot starts'}
        </span>
        <Button size="sm" icon={<Play className="size-3.5" aria-hidden />} onClick={onUse}>
          Use
        </Button>
      </div>
    </Card>
  );
}
