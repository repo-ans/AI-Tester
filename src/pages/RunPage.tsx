import { useMemo, type ReactNode } from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, MessageSquare, Phone, Play, Save } from 'lucide-react';
import type { Channel, StartTestInput, TeamSettings } from '@/api/client';
import { useSaveScenario, useScenarios, useStartTest, useTeamSettings } from '@/api/hooks';
import { PageHeader } from '@/components/Layout';
import { BotStartsCheckbox } from '@/components/BotStartsCheckbox';
import { ScenarioFields } from '@/components/ScenarioFields';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { CHANNEL_LABEL, cn } from '@/lib/format';
import { isRunPrefill, type RunPrefill } from '@/lib/prefill';
import {
  getLastRun,
  initialTargets,
  pickTargets,
  saveLastRun,
  type TargetValues,
} from '@/lib/storage';
import {
  CHAT_MESSAGE_TYPES,
  EMPTY_SCENARIO_FIELDS,
  cleanPhone,
  fromScenarioFields,
  runFormSchema,
  toScenarioFields,
  type RunFormValues,
} from '@/lib/validation';

export function RunPage() {
  const location = useLocation();
  const prefill = isRunPrefill(location.state) ? location.state.prefill : undefined;
  const settings = useTeamSettings();
  // Wait for the team's shared numbers so the form starts filled in.
  if (settings.isPending) return <RunSkeleton />;
  // Remount the form whenever we navigate here with new prefill data.
  return <RunForm key={location.key} prefill={prefill} settings={settings.data ?? NO_SETTINGS} />;
}

const NO_SETTINGS: TeamSettings = {
  sms_tester_number: '',
  voice_from_number: '',
  voice_tester_agent_id: '',
  chat_location_id: '',
};

function RunSkeleton() {
  return (
    <div aria-label="Loading" className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function buildDefaults(settings: TeamSettings, prefill?: RunPrefill): RunFormValues {
  const targets: TargetValues = { ...initialTargets(settings), ...prefill?.targets };
  return {
    channel: prefill?.channel ?? getLastRun().channel,
    ...targets,
    ...(prefill?.scenario ? toScenarioFields(prefill.scenario) : EMPTY_SCENARIO_FIELDS),
  };
}

function toStartInput(v: RunFormValues): StartTestInput {
  const scenario = fromScenarioFields(v, v.channel);
  switch (v.channel) {
    case 'sms':
      return {
        channel: 'sms',
        target: { tester_number: cleanPhone(v.sms_tester), bot_number: cleanPhone(v.sms_bot) },
        scenario,
      };
    case 'voice':
      return {
        channel: 'voice',
        target: {
          from_number: cleanPhone(v.voice_from),
          to_number: cleanPhone(v.voice_to),
          ...(v.voice_agent.trim() ? { tester_agent_id: v.voice_agent.trim() } : {}),
        },
        scenario,
      };
    case 'chat':
      return {
        channel: 'chat',
        target: {
          location_id: v.chat_location.trim(),
          message_type: v.chat_message_type,
          conversation_provider_id: v.chat_provider.trim() || null,
        },
        scenario,
      };
  }
}

function RunForm({ prefill, settings }: { prefill?: RunPrefill; settings: TeamSettings }) {
  const defaultValues = useMemo(() => buildDefaults(settings, prefill), [settings, prefill]);
  const form = useForm<RunFormValues>({
    resolver: zodResolver(runFormSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const navigate = useNavigate();
  const toast = useToast();
  const start = useStartTest();
  const saveScenario = useSaveScenario();
  const channel = useWatch({ control: form.control, name: 'channel' });

  const onSubmit = form.handleSubmit((values) => {
    start.mutate(toStartInput(values), {
      onSuccess: (res) => {
        saveLastRun({ channel: values.channel, targets: pickTargets(values) });
        toast.success(`Test #${res.session_id} started`);
        navigate(`/tests/${res.session_id}`);
      },
    });
  });

  async function saveAsScenario() {
    const ok = await form.trigger(['name', 'persona', 'goal', 'max_turns']);
    if (!ok) {
      toast.error('Fill in name, persona and goal before saving');
      return;
    }
    const values = form.getValues();
    saveScenario.mutate(
      {
        ...fromScenarioFields(values),
        channel: values.channel,
        bot_starts: values.channel === 'sms' && values.bot_starts,
      },
      { onSuccess: (s) => toast.success(`Saved scenario "${s?.name ?? values.name}"`) },
    );
  }

  return (
    <FormProvider {...form}>
      <PageHeader
        title="Run a test"
        description="An AI customer will talk to the bot, then an AI judge grades the conversation."
      />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
        <Card>
          <CardHeader
            title="1. Where is the bot?"
            description="Pick a channel and tell us how to reach the bot."
          />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <ChannelSwitch />
            <TargetFields channel={channel} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="2. What should the AI customer do?"
            description="Describe the customer, their goal, and what the judge should check."
            actions={<LoadScenario channel={channel} />}
          />
          <div className="px-4 py-4 sm:px-5">
            <ScenarioFields />
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            icon={<Save className="size-4" aria-hidden />}
            onClick={() => void saveAsScenario()}
            loading={saveScenario.isPending}
          >
            Save as scenario
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={start.isPending}
            icon={<Play className="size-4" aria-hidden />}
          >
            Start test
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// ---------- Channel switch ----------

const CHANNEL_OPTIONS: Array<{ value: Channel; icon: ReactNode }> = [
  { value: 'sms', icon: <MessageSquare className="size-4" aria-hidden /> },
  { value: 'voice', icon: <Phone className="size-4" aria-hidden /> },
  { value: 'chat', icon: <Globe className="size-4" aria-hidden /> },
];

function ChannelSwitch() {
  const { register, control } = useFormContext<RunFormValues>();
  const current = useWatch({ control, name: 'channel' });
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
        Channel
      </legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/70">
        {CHANNEL_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-500',
              current === opt.value
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            <input type="radio" value={opt.value} className="sr-only" {...register('channel')} />
            {opt.icon}
            <span className="truncate">{CHANNEL_LABEL[opt.value]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------- Target fields ----------

interface TextFieldProps {
  name: keyof TargetValues;
  label: string;
  hint: ReactNode;
  placeholder?: string;
  optional?: boolean;
  tel?: boolean;
}

function TextField({ name, label, hint, placeholder, optional, tel }: TextFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RunFormValues>();
  return (
    <Field label={label} hint={hint} error={errors[name]?.message} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type={tel ? 'tel' : 'text'}
          inputMode={tel ? 'tel' : undefined}
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby={describedBy}
          invalid={invalid}
          {...register(name)}
        />
      )}
    </Field>
  );
}

function TargetFields({ channel }: { channel: Channel }) {
  const { register } = useFormContext<RunFormValues>();

  if (channel === 'sms') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="sms_tester"
          tel
          label="Tester number"
          placeholder="+15550001111"
          hint="Our ClickSend number. Filled from the team Settings."
        />
        <TextField
          name="sms_bot"
          tel
          label="Bot number"
          placeholder="+15550002222"
          hint="The client's GHL number the bot answers on."
        />
        <BotStartsCheckbox className="sm:col-span-2" />
      </div>
    );
  }

  if (channel === 'voice') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="voice_from"
          tel
          label="From number"
          placeholder="+15550001111"
          hint="Our Retell number. Filled from the team Settings."
        />
        <TextField
          name="voice_to"
          tel
          label="Bot number"
          placeholder="+15550002222"
          hint="The client's voice agent number to call."
        />
        <TextField
          name="voice_agent"
          optional
          label="Tester agent ID"
          placeholder="agent_…"
          hint="Retell agent that plays the customer. Filled from the team Settings."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        name="chat_location"
        label="Location ID"
        hint="The client's GHL sub-account (location) ID."
      />
      <Field label="Message type" hint="How messages are sent into the GHL conversation.">
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} {...register('chat_message_type')}>
            {CHAT_MESSAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <TextField
        name="chat_provider"
        optional
        label="Conversation provider ID"
        hint="Only needed for the Custom message type."
      />
    </div>
  );
}

// ---------- Load saved scenario ----------

function LoadScenario({ channel }: { channel: Channel }) {
  const { data, isLoading } = useScenarios();
  const { getValues, reset } = useFormContext<RunFormValues>();
  const toast = useToast();
  const options = (data ?? []).filter((s) => s.channel === 'any' || s.channel === channel);

  return (
    <Select
      aria-label="Load saved scenario"
      className="w-56 max-w-full"
      value=""
      disabled={isLoading || options.length === 0}
      onChange={(e) => {
        const s = options.find((o) => String(o.id) === e.target.value);
        if (!s) return;
        reset({ ...getValues(), ...toScenarioFields(s) });
        toast.info(`Loaded "${s.name}"`);
      }}
    >
      <option value="">
        {isLoading
          ? 'Loading scenarios…'
          : options.length
            ? 'Load saved scenario…'
            : 'No saved scenarios'}
      </option>
      {options.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  );
}
