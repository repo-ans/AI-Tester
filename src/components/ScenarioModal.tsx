import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Scenario } from '@/api/client';
import { useSaveScenario } from '@/api/hooks';
import { BotStartsCheckbox } from '@/components/BotStartsCheckbox';
import { ScenarioInput } from '@/components/ScenarioInput';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { CHANNEL_LABEL } from '@/lib/format';
import {
  EMPTY_SCENARIO_FIELDS,
  botStartsApplies,
  scenarioFormSchema,
  toScenarioFields,
  toScenarioInput,
  type ScenarioFormValues,
} from '@/lib/validation';

interface ScenarioModalProps {
  open: boolean;
  /** Scenario to edit, or null to create a new one. */
  scenario: Scenario | null;
  onClose: () => void;
}

export function ScenarioModal({ open, scenario, onClose }: ScenarioModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={scenario ? 'Edit scenario' : 'New scenario'}
      description="A reusable script for the AI customer."
    >
      {/* Keyed so the form resets when switching between scenarios */}
      {open && <ScenarioForm key={scenario?.id ?? 'new'} scenario={scenario} onDone={onClose} />}
    </Modal>
  );
}

function ScenarioForm({ scenario, onDone }: { scenario: Scenario | null; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveScenario();
  const form = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: scenario
      ? { channel: scenario.channel, ...toScenarioFields(scenario) }
      : { channel: 'any', ...EMPTY_SCENARIO_FIELDS },
    mode: 'onTouched',
  });

  const channel = useWatch({ control: form.control, name: 'channel' });

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(toScenarioInput(values, scenario?.id), {
      onSuccess: (saved) => {
        if (!saved) {
          toast.error('That scenario no longer exists');
          return;
        }
        toast.success(scenario ? 'Scenario updated' : 'Scenario created');
        onDone();
      },
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
        <Field
          label="Channel"
          hint="“Any channel” scenarios show up for SMS, voice and chat tests."
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              className="sm:w-56"
              {...form.register('channel')}
            >
              {(['any', 'sms', 'voice', 'chat'] as const).map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {botStartsApplies(channel) && <BotStartsCheckbox />}
        <ScenarioInput defaultOpen={scenario !== null} />
        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Button onClick={onDone}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {scenario ? 'Save changes' : 'Create scenario'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
