import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/format';
import type { ScenarioFieldValues } from '@/lib/validation';

/** "Bot sends the first message" toggle. Used inside a <FormProvider>. */
export function BotStartsCheckbox({ className }: { className?: string }) {
  const { register } = useFormContext<ScenarioFieldValues>();
  const id = useId();
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={`${id}-hint`}
        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 accent-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:border-zinc-600 dark:focus-visible:ring-offset-zinc-900"
        {...register('bot_starts')}
      />
      <div>
        <label
          htmlFor={id}
          className="cursor-pointer text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
        >
          Bot sends the first message (e.g. form-triggered workflow)
        </label>
        <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
          The AI customer waits for the bot to text first instead of opening the conversation.
        </p>
      </div>
    </div>
  );
}
