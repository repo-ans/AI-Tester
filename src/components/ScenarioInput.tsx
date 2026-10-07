import { useEffect, useId, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronRight, ClipboardCopy, Sparkles, TriangleAlert } from 'lucide-react';
import { ScenarioFields } from '@/components/ScenarioFields';
import { Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/format';
import { PASTE_FORMAT_PROMPT, parseScenario, type ParsedScenario } from '@/lib/parseScenario';
import type { ScenarioFieldValues } from '@/lib/validation';

const FIELDS = ['name', 'persona', 'goal', 'checks', 'max_turns'] as const;

/**
 * One paste box for the whole test. Pasted text is split into the scenario
 * fields, which stay available (folded) underneath for review and edits.
 * Used inside a <FormProvider>.
 */
export function ScenarioInput({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const {
    setValue,
    formState: { errors, submitCount },
  } = useFormContext<ScenarioFieldValues>();
  const toast = useToast();
  const pasteId = useId();
  const [paste, setPaste] = useState('');
  const [parsed, setParsed] = useState<ParsedScenario | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  // Unfold the fields whenever one of them is invalid (Start test or Save as scenario).
  const hasError = FIELDS.some((f) => errors[f]);
  useEffect(() => {
    if (hasError) setOpen(true);
  }, [hasError]);

  function apply(text: string) {
    setPaste(text);
    const p = parseScenario(text);
    setParsed(text.trim() ? p : null);
    const opts = { shouldDirty: true, shouldValidate: submitCount > 0 };
    if (p.name !== undefined) setValue('name', p.name, opts);
    if (p.persona !== undefined) setValue('persona', p.persona, opts);
    if (p.goal !== undefined) setValue('goal', p.goal, opts);
    if (p.checks) {
      setValue(
        'checks',
        p.checks.map((value) => ({ value })),
        opts,
      );
    }
    if (p.max_turns !== undefined) setValue('max_turns', p.max_turns, opts);
  }

  async function copyFormat() {
    try {
      await navigator.clipboard.writeText(PASTE_FORMAT_PROMPT);
      toast.success('Format copied — paste it into your AI chat');
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            htmlFor={pasteId}
            className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
          >
            Paste the test
          </label>
          <button
            type="button"
            onClick={() => void copyFormat()}
            className="inline-flex items-center gap-1 rounded text-xs font-medium text-accent-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:text-accent-400"
          >
            <ClipboardCopy className="size-3.5" aria-hidden />
            Copy format for your AI
          </button>
        </div>
        <Textarea
          id={pasteId}
          rows={8}
          value={paste}
          onChange={(e) => apply(e.target.value)}
          aria-describedby={`${pasteId}-hint`}
          placeholder={
            'Paste the whole test here, e.g.\n\nTest name: Book an AC repair\nPersona: Sarah Jones, 12 Oak St, Austin TX. Phone +15125550100…\nGoal: Get a visit booked for Thursday afternoon\nChecks:\n- Bot asks for the address\n- Bot confirms the time before booking'
          }
          className="font-mono text-[13px]"
        />
        <PasteStatus id={`${pasteId}-hint`} parsed={parsed} />
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
        >
          <ChevronRight
            className={cn(
              'size-4 shrink-0 text-zinc-400 transition-transform',
              open && 'rotate-90',
            )}
            aria-hidden
          />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Test details</span>
          <FieldSummary hasError={hasError} />
        </button>
        {open && (
          <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
            <ScenarioFields />
          </div>
        )}
      </div>
    </div>
  );
}

function PasteStatus({ id, parsed }: { id: string; parsed: ParsedScenario | null }) {
  if (!parsed) {
    return (
      <p id={id} className="text-xs text-zinc-500 dark:text-zinc-400">
        The name, persona, goal, checks and max messages are picked out automatically. Or load a
        saved scenario above.
      </p>
    );
  }
  const found = [
    parsed.name && 'name',
    parsed.persona && 'persona',
    parsed.goal && 'goal',
    parsed.checks?.length &&
      `${parsed.checks.length} ${parsed.checks.length === 1 ? 'check' : 'checks'}`,
    parsed.max_turns && `max ${parsed.max_turns} messages`,
  ].filter(Boolean);
  const onlyPersona = found.length === 1 && parsed.persona;
  if (onlyPersona || !found.length) {
    return (
      <p id={id} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
        No labels found (like “Persona:”, “Goal:”, “Checks:”), so everything went into Persona. Add
        the labels, or use “Copy format for your AI”.
      </p>
    );
  }
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
      <Sparkles className="mt-px size-3.5 shrink-0" aria-hidden />
      Filled in: {found.join(', ')}. Open Test details below to review.
    </p>
  );
}

function FieldSummary({ hasError }: { hasError: boolean }) {
  const { control } = useFormContext<ScenarioFieldValues>();
  const [name, persona, goal, checks, max] = useWatch({ control, name: [...FIELDS] });
  const checkCount = (checks ?? []).filter((c) => c.value.trim()).length;
  const parts = [
    name?.trim() || 'No name',
    persona?.trim() ? 'persona ✓' : 'no persona',
    goal?.trim() ? 'goal ✓' : 'no goal',
    `${checkCount} ${checkCount === 1 ? 'check' : 'checks'}`,
    `${Number.isFinite(max) ? max : '?'} msgs`,
  ];
  return (
    <span
      className={cn(
        'min-w-0 flex-1 truncate text-xs',
        hasError ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400',
      )}
    >
      {hasError ? 'Some details need fixing — ' : ''}
      {parts.join(' · ')}
    </span>
  );
}
