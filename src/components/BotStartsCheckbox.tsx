import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import type { ScenarioChannel } from '@/api/client';
import { cn } from '@/lib/format';
import type { ScenarioFieldValues } from '@/lib/validation';

const TEXT: Record<'sms' | 'voice' | 'any', { label: string; hint: string }> = {
  sms: {
    label: 'Bot sends the first message (e.g. form-triggered workflow)',
    hint: 'The AI customer waits for the bot to text first instead of opening the conversation.',
  },
  voice: {
    label: 'Bot calls us (outbound agent)',
    hint: 'The AI customer does not dial. It waits on our tester number and answers when the bot calls it.',
  },
  any: {
    label: 'Bot starts the conversation (outbound)',
    hint: 'SMS: the bot texts first. Voice: the bot calls our tester number and the AI customer answers.',
  },
};

/** "Bot starts" toggle (SMS: bot texts first; voice: outbound bot calls us). Inside a <FormProvider>. */
export function BotStartsCheckbox({
  channel = 'sms',
  className,
}: {
  channel?: ScenarioChannel;
  className?: string;
}) {
  const { register } = useFormContext<ScenarioFieldValues>();
  const id = useId();
  const text = TEXT[channel === 'chat' ? 'sms' : channel];
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
          {text.label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
          {text.hint}
        </p>
      </div>
    </div>
  );
}
