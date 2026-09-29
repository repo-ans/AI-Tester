import type { Channel, ScenarioChannel } from '@/api/client';

export const CHANNEL_LABEL: Record<ScenarioChannel, string> = {
  any: 'Any channel',
  sms: 'SMS',
  voice: 'Voice call',
  chat: 'Website chat',
};

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type ScoreTone = 'good' | 'warn' | 'bad';

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

export const SCORE_TEXT: Record<ScoreTone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  if (Number.isNaN(diff)) return '—';
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'just now';
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

export function shortTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m ? `${m}m ${rest}s` : `${rest}s`;
}

export function secondsBetween(startIso: string, endIso: string | null): number | null {
  if (!endIso) return null;
  const diff = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000;
  return Number.isFinite(diff) ? diff : null;
}

export function humanize(value: string): string {
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isChannel(v: string): v is Channel {
  return v === 'sms' || v === 'voice' || v === 'chat';
}
