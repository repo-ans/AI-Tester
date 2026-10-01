import type { Channel, ChatMessageType, TeamSettings } from '@/api/client';

/** Safe JSON localStorage helpers (storage can throw in private mode). */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ---------- Last used channel + targets on the Run page ----------

export interface TargetValues {
  sms_tester: string;
  sms_bot: string;
  voice_from: string;
  voice_to: string;
  voice_agent: string;
  chat_location: string;
  chat_message_type: ChatMessageType;
  chat_provider: string;
}

export interface LastRun {
  channel: Channel;
  targets: TargetValues;
}

const LAST_RUN_KEY = 'abt.lastRun';
export const EMPTY_TARGETS: TargetValues = {
  sms_tester: '',
  sms_bot: '',
  voice_from: '',
  voice_to: '',
  voice_agent: '',
  chat_location: '',
  chat_message_type: 'Live_Chat',
  chat_provider: '',
};

export function getLastRun(): LastRun {
  const stored = readJson<LastRun>(LAST_RUN_KEY, { channel: 'sms', targets: EMPTY_TARGETS });
  return { channel: stored.channel, targets: { ...EMPTY_TARGETS, ...stored.targets } };
}

export const saveLastRun = (r: LastRun) => writeJson(LAST_RUN_KEY, r);

/**
 * Initial target values: the team's shared Settings win for "our side" fields
 * when set; the client's side (bot number etc.) comes from this browser's last run.
 */
export function initialTargets(d: TeamSettings): TargetValues {
  const last = getLastRun().targets;
  return {
    ...last,
    sms_tester: d.sms_tester_number || last.sms_tester,
    voice_from: d.voice_from_number || last.voice_from,
    voice_agent: d.voice_tester_agent_id || last.voice_agent,
    chat_location: d.chat_location_id || last.chat_location,
  };
}

/** Copies just the target fields out of a larger form value object. */
export function pickTargets(v: TargetValues): TargetValues {
  return {
    sms_tester: v.sms_tester,
    sms_bot: v.sms_bot,
    voice_from: v.voice_from,
    voice_to: v.voice_to,
    voice_agent: v.voice_agent,
    chat_location: v.chat_location,
    chat_message_type: v.chat_message_type,
    chat_provider: v.chat_provider,
  };
}
