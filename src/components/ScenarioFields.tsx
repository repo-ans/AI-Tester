import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import type { ScenarioFieldValues } from '@/lib/validation';

/**
 * The shared scenario fields (name, persona, goal, checks, max messages).
 * Used inside a <FormProvider> by both the Run form and the Scenario modal.
 */
export function ScenarioFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ScenarioFieldValues>();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field label="Test name" error={errors.name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              placeholder="e.g. Book an AC repair"
              {...register('name')}
            />
          )}
        </Field>
        <Field label="Max messages" error={errors.max_turns?.message} hint="2–30">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={2}
              max={30}
              aria-describedby={describedBy}
              invalid={invalid}
              {...register('max_turns', { valueAsNumber: true })}
            />
          )}
        </Field>
      </div>

      <Field
        label="Persona"
        error={errors.persona?.message}
        hint="Who the AI customer is. Put the name, phone, email and address the bot may ask for."
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={4}
            aria-describedby={describedBy}
            invalid={invalid}
            placeholder="Sarah Jones, 34, lives at 12 Oak St, Austin TX. Phone +15125550100. Polite but in a hurry."
            {...register('persona')}
          />
        )}
      </Field>

      <Field
        label="Goal"
        error={errors.goal?.message}
        hint="What the AI customer is trying to get done in this conversation."
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={2}
            aria-describedby={describedBy}
            invalid={invalid}
            placeholder="Book an AC repair appointment for this Thursday afternoon."
            {...register('goal')}
          />
        )}
      </Field>

      <ChecksEditor />
    </div>
  );
}

function ChecksEditor() {
  const { control, register } = useFormContext<ScenarioFieldValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'checks' });
  const values = useWatch({ control, name: 'checks' });
  const filled = (values ?? []).filter((c) => c.value.trim()).length;

  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
        Checks
        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
          — what the judge should verify
        </span>
      </legend>

      <ol className="space-y-2">
        {fields.map((field, index) => (
          <li key={field.id} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-400">
              {index + 1}.
            </span>
            <Input
              aria-label={`Check ${index + 1}`}
              placeholder="e.g. Bot asked for the customer's address"
              className="min-w-0 flex-1"
              {...register(`checks.${index}.value` as const)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  append({ value: '' });
                }
              }}
            />
            <div className="flex shrink-0">
              <IconButton
                label={`Move check ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp className="size-3.5" />
              </IconButton>
              <IconButton
                label={`Move check ${index + 1} down`}
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown className="size-3.5" />
              </IconButton>
              <IconButton label={`Remove check ${index + 1}`} onClick={() => remove(index)}>
                <X className="size-3.5" />
              </IconButton>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus className="size-4" />}
          onClick={() => append({ value: '' })}
        >
          Add check
        </Button>
        {filled === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="size-3.5" aria-hidden />
            No checks yet — the judge will only grade the goal.
          </p>
        )}
      </div>
    </fieldset>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      {children}
    </button>
  );
}
