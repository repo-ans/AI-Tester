import {
  Ban,
  CircleCheck,
  CircleX,
  Globe,
  Layers,
  Loader2,
  MessageSquare,
  Phone,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ScenarioChannel, Status } from '@/api/client';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { CHANNEL_LABEL, SCORE_TEXT, cn, scoreTone } from '@/lib/format';

const CHANNEL_META: Record<ScenarioChannel, { tone: BadgeTone; icon: ReactNode }> = {
  any: { tone: 'neutral', icon: <Layers className="size-3" aria-hidden /> },
  sms: { tone: 'blue', icon: <MessageSquare className="size-3" aria-hidden /> },
  voice: { tone: 'violet', icon: <Phone className="size-3" aria-hidden /> },
  chat: { tone: 'teal', icon: <Globe className="size-3" aria-hidden /> },
};

export function ChannelChip({ channel }: { channel: ScenarioChannel }) {
  const meta = CHANNEL_META[channel];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {channel === 'any' ? 'Any' : CHANNEL_LABEL[channel]}
    </Badge>
  );
}

const STATUS_META: Record<Status, { tone: BadgeTone; label: string; icon: ReactNode }> = {
  running: {
    tone: 'accent',
    label: 'Running',
    icon: <Loader2 className="size-3 animate-spin" aria-hidden />,
  },
  passed: { tone: 'green', label: 'Passed', icon: <CircleCheck className="size-3" aria-hidden /> },
  failed: { tone: 'red', label: 'Failed', icon: <CircleX className="size-3" aria-hidden /> },
  aborted: { tone: 'neutral', label: 'Stopped', icon: <Ban className="size-3" aria-hidden /> },
};

export function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <Badge
      tone={meta.tone}
      icon={meta.icon}
      className={status === 'running' ? 'animate-pulse' : ''}
    >
      {meta.label}
    </Badge>
  );
}

interface ScoreProps {
  score: number | null | undefined;
  className?: string;
}

/** Score with color + a text grade, so color is never the only signal. */
export function Score({ score, className }: ScoreProps) {
  if (score === null || score === undefined) {
    return <span className={cn('text-zinc-400', className)}>—</span>;
  }
  const tone = scoreTone(score);
  return (
    <span
      className={cn('font-semibold tabular-nums', SCORE_TEXT[tone], className)}
      title={
        tone === 'good' ? 'Good (80+)' : tone === 'warn' ? 'Needs work (60–79)' : 'Poor (under 60)'
      }
    >
      {Math.round(score)}
    </span>
  );
}
