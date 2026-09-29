import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';

const MIN_LENGTH = 8;

const schema = z
  .object({
    password: z.string().min(MIN_LENGTH, `Use at least ${MIN_LENGTH} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

type Values = z.infer<typeof schema>;

interface PasswordFormProps {
  submitLabel: string;
  onSuccess: () => void;
  className?: string;
}

/** New password + confirm → supabase.auth.updateUser. Needs an active session. */
export function PasswordForm({ submitLabel, onSuccess, className }: PasswordFormProps) {
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(undefined);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(error.message);
      return;
    }
    reset();
    onSuccess();
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className={className}>
      <div className="space-y-4">
        <Field
          label="New password"
          error={errors.password?.message}
          hint={`At least ${MIN_LENGTH} characters.`}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
              {...register('password')}
            />
          )}
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
              {...register('confirm')}
            />
          )}
        </Field>
        {serverError && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {serverError}
          </p>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
