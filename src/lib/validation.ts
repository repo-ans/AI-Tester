import { z } from 'zod';
import type {
  ChatMessageType,
  ScenarioChannel,
  ScenarioInput,
  SessionScenario,
  TestScenario,
} from '@/api/client';

export const E164 = /^\+[1-9]\d{6,14}$/;

/** Strips spaces, dashes, dots and brackets so "+1 (555) 010-2030" validates. */
export function cleanPhone(v: string): string {
  return v.replace(/[\s\-().]/g, '');
}

export const CHAT_MESSAGE_TYPES: ChatMessageType[] = ['Live_Chat', 'WebChat', 'SMS', 'Custom'];

export const scenarioFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Give the test a name'),
  persona: z.string().trim().min(1, 'Describe who the AI customer is'),
  goal: z.string().trim().min(1, 'Say what the AI customer is trying to do'),
  checks: z.array(z.object({ value: z.string() })),
  max_turns: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole numbers only')
    .min(2, 'At least 2')
    .max(30, 'At most 30'),
  /** SMS only: wait for the bot to text first. */
  bot_starts: z.boolean(),
});

export type ScenarioFieldValues = z.infer<typeof scenarioFieldsSchema>;

export const EMPTY_SCENARIO_FIELDS: ScenarioFieldValues = {
  name: '',
  persona: '',
  goal: '',
  checks: [{ value: '' }],
  max_turns: 10,
  bot_starts: false,
};

export function toScenarioFields(s: SessionScenario): ScenarioFieldValues {
  const checks = (s.checks ?? []).map((value) => ({ value }));
  return {
    name: s.name ?? '',
    persona: s.persona ?? '',
    goal: s.goal ?? '',
    checks: checks.length ? checks : [{ value: '' }],
    max_turns: s.max_turns ?? 10,
    bot_starts: s.bot_starts === true,
  };
}

/** Scenario payload for start_test. `bot_starts: true` is only sent for SMS. */
export function fromScenarioFields(
  v: ScenarioFieldValues,
  channel?: ScenarioChannel,
): TestScenario {
  return {
    name: v.name.trim(),
    persona: v.persona.trim(),
    goal: v.goal.trim(),
    checks: v.checks.map((c) => c.value.trim()).filter(Boolean),
    max_turns: v.max_turns,
    ...(v.bot_starts && channel === 'sms' ? { bot_starts: true as const } : {}),
  };
}

/** bot_starts only applies to SMS (and "any" scenarios, which can run on SMS). */
export function botStartsApplies(channel: ScenarioChannel): boolean {
  return channel === 'sms' || channel === 'any';
}

// ---------- Run form ----------

const phone = (label: string) => ({ label, phone: true as const });
const text = (label: string) => ({ label, phone: false as const });

/** Required target fields per channel, with whether each must be E.164. */
const REQUIRED_TARGETS = {
  sms: { sms_tester: phone('Tester number'), sms_bot: phone('Bot number') },
  voice: { voice_from: phone('From number'), voice_to: phone('Bot number') },
  chat: { chat_location: text('Location ID') },
} as const;

export const runFormSchema = scenarioFieldsSchema
  .extend({
    channel: z.enum(['sms', 'voice', 'chat']),
    sms_tester: z.string(),
    sms_bot: z.string(),
    voice_from: z.string(),
    voice_to: z.string(),
    voice_agent: z.string(),
    chat_location: z.string(),
    chat_message_type: z.enum(['Live_Chat', 'WebChat', 'SMS', 'Custom']),
    chat_provider: z.string(),
  })
  .superRefine((v, ctx) => {
    for (const [field, rule] of Object.entries(REQUIRED_TARGETS[v.channel])) {
      const raw = v[field as keyof typeof v];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) {
        ctx.addIssue({ code: 'custom', path: [field], message: `${rule.label} is required` });
      } else if (rule.phone && !E164.test(cleanPhone(value))) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Use international format, e.g. +15551234567',
        });
      }
    }
  });

export type RunFormValues = z.infer<typeof runFormSchema>;

// ---------- Scenario modal ----------

export const scenarioFormSchema = scenarioFieldsSchema.extend({
  channel: z.enum(['any', 'sms', 'voice', 'chat']),
});

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

export function toScenarioInput(v: ScenarioFormValues, id?: number): ScenarioInput {
  return {
    ...fromScenarioFields(v),
    channel: v.channel,
    bot_starts: botStartsApplies(v.channel) && v.bot_starts,
    ...(id ? { id } : {}),
  };
}
