import type { Channel, Session, SessionScenario } from '@/api/client';
import type { TargetValues } from './storage';

/** Router state accepted by /run to prefill the form. */
export interface RunPrefill {
  channel?: Channel;
  targets?: Partial<TargetValues>;
  scenario?: SessionScenario;
}

export function isRunPrefill(value: unknown): value is { prefill: RunPrefill } {
  return typeof value === 'object' && value !== null && 'prefill' in value;
}

/** Rebuild Run form values from a finished session ("Run again"). */
export function prefillFromSession(s: Session): RunPrefill {
  const targets: Partial<TargetValues> =
    s.channel === 'sms'
      ? { sms_tester: s.tester_number, sms_bot: s.bot_number }
      : s.channel === 'voice'
        ? { voice_from: s.tester_number, voice_to: s.bot_number }
        : { chat_location: s.bot_number };
  return { channel: s.channel, targets, scenario: s.scenario };
}
