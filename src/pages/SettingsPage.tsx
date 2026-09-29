import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Monitor, Moon, Save, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/Layout';
import { PasswordForm } from '@/components/PasswordForm';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/format';
import { getDefaults, saveDefaults, type Defaults } from '@/lib/storage';
import { useTheme, type ThemePref } from '@/lib/theme';
import { E164, cleanPhone } from '@/lib/validation';

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => !v || E164.test(cleanPhone(v)), 'Use international format, e.g. +15551234567');

const schema = z.object({
  sms_tester_number: optionalPhone,
  voice_from_number: optionalPhone,
  voice_tester_agent_id: z.string().trim(),
  chat_location_id: z.string().trim(),
});

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Defaults and theme are saved in this browser only."
      />
      <div className="max-w-2xl space-y-4">
        <DefaultsCard />
        <ThemeCard />
        <PasswordCard />
      </div>
    </>
  );
}

function DefaultsCard() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Defaults>({ resolver: zodResolver(schema), defaultValues: getDefaults() });

  const onSubmit = handleSubmit((values) => {
    const cleaned: Defaults = {
      ...values,
      sms_tester_number: cleanPhone(values.sms_tester_number),
      voice_from_number: cleanPhone(values.voice_from_number),
    };
    saveDefaults(cleaned);
    reset(cleaned);
    toast.success('Defaults saved');
  });

  const field = (name: keyof Defaults, label: string, hint: string, placeholder?: string) => (
    <Field label={label} hint={hint} error={errors[name]?.message}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby={describedBy}
          invalid={invalid}
          {...register(name)}
        />
      )}
    </Field>
  );

  return (
    <Card>
      <CardHeader title="Test defaults" description="Pre-filled on the Run test page." />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4 px-4 py-4 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            'sms_tester_number',
            'ClickSend tester number',
            'Our SMS number the AI customer texts from.',
            '+15550001111',
          )}
          {field(
            'voice_from_number',
            'Retell “from” number',
            'Our Retell number the AI customer calls from.',
            '+15550001111',
          )}
          {field(
            'voice_tester_agent_id',
            'Retell tester agent ID',
            'The Retell agent that plays the customer.',
            'agent_…',
          )}
          {field(
            'chat_location_id',
            'GHL location ID',
            'Default sub-account for website chat tests.',
          )}
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            icon={<Save className="size-4" aria-hidden />}
          >
            Save defaults
          </Button>
        </div>
      </form>
    </Card>
  );
}

const THEMES: Array<{ value: ThemePref; label: string; icon: ReactNode }> = [
  { value: 'system', label: 'System', icon: <Monitor className="size-4" aria-hidden /> },
  { value: 'light', label: 'Light', icon: <Sun className="size-4" aria-hidden /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-4" aria-hidden /> },
];

function ThemeCard() {
  const [theme, setTheme] = useTheme();
  return (
    <Card>
      <CardHeader title="Appearance" />
      <fieldset className="px-4 py-4 sm:px-5">
        <legend className="sr-only">Theme</legend>
        <div className="grid max-w-sm grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/70">
          {THEMES.map((t) => (
            <label
              key={t.value}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-500',
                theme === t.value
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={theme === t.value}
                onChange={() => setTheme(t.value)}
                className="sr-only"
              />
              {t.icon}
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

function PasswordCard() {
  const { email } = useAuth();
  const toast = useToast();
  return (
    <Card>
      <CardHeader
        title="Change password"
        description={email ? `Signed in as ${email}` : undefined}
      />
      <PasswordForm
        className="px-4 py-4 sm:px-5"
        submitLabel="Update password"
        onSuccess={() => toast.success('Password updated')}
      />
    </Card>
  );
}
