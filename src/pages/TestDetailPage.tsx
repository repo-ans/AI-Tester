import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  FileQuestion,
  MessageSquare,
  Phone,
  RotateCcw,
  Square,
  TriangleAlert,
} from 'lucide-react';
import type { Message, Session } from '@/api/client';
import { useAbortSession, useSession } from '@/api/hooks';
import { ChannelChip, Score, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  cn,
  formatDuration,
  fullDate,
  humanize,
  relativeTime,
  secondsBetween,
  shortTime,
} from '@/lib/format';
import { prefillFromSession } from '@/lib/prefill';
import { useNow } from '@/lib/useNow';

export function TestDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, isLoading } = useSession(id);

  if (!Number.isFinite(id)) return <Missing />;
  if (isLoading) return <DetailSkeleton />;
  if (!data) return <Missing />;

  return <Detail session={data.session} messages={data.messages} />;
}

function Detail({ session, messages }: { session: Session; messages: Message[] }) {
  const running = session.status === 'running';
  return (
    <>
      <BackLink />
      <Header session={session} messages={messages} />
      {/* Conversation first on mobile, second column on desktop */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="order-2 space-y-4 lg:order-1">
          <JudgeReport session={session} />
          <ScenarioCard session={session} />
        </div>
        <div className="order-1 lg:order-2">
          <Conversation session={session} messages={messages} running={running} />
        </div>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/tests"
      className="mb-3 inline-flex items-center gap-1 rounded text-sm text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <ArrowLeft className="size-4" aria-hidden />
      All results
    </Link>
  );
}

// ---------- Header ----------

function transcriptText(session: Session, messages: Message[]): string {
  if (messages.length) {
    return messages
      .map((m) => `${m.role === 'tester' ? 'AI customer' : 'Bot'}: ${m.content}`)
      .join('\n\n');
  }
  return session.result?.transcript ?? '';
}

function Header({ session, messages }: { session: Session; messages: Message[] }) {
  const toast = useToast();
  const navigate = useNavigate();
  const abort = useAbortSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const now = useNow();
  const result = session.result;
  const running = session.status === 'running';
  const recording = result?.extra?.recording_url;
  const duration =
    result?.extra?.duration_sec ??
    (session.channel === 'voice' ? secondsBetween(session.created_at, session.finished_at) : null);
  const target = session.channel === 'chat' ? `Location ${session.bot_number}` : session.bot_number;

  async function copyTranscript() {
    const text = transcriptText(session, messages);
    if (!text) {
      toast.info('No transcript yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcript copied');
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  }

  function stop() {
    abort.mutate(session.id, {
      onSuccess: (res) => {
        setConfirmOpen(false);
        if (res.aborted) toast.success('Test stopped');
        else toast.info('The test had already finished');
      },
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <ChannelChip channel={session.channel} />
            <StatusBadge status={session.status} />
            <span className="tabular-nums">#{session.id}</span>
            <span aria-hidden>·</span>
            <time dateTime={session.created_at} title={fullDate(session.created_at)}>
              Started {relativeTime(session.created_at, now)}
            </time>
          </div>
          <h1 className="mt-2 break-words text-xl font-semibold tracking-tight">
            {session.scenario.name || 'Untitled test'}
          </h1>
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex gap-1">
              <dt>Bot:</dt>
              <dd className="break-all font-medium text-zinc-700 dark:text-zinc-300">{target}</dd>
            </div>
            {result?.end_reason && (
              <div className="flex gap-1">
                <dt>Ended:</dt>
                <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                  {humanize(result.end_reason)}
                </dd>
              </div>
            )}
            {duration !== null && duration !== undefined && (
              <div className="flex gap-1">
                <dt>Duration:</dt>
                <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatDuration(duration)}
                </dd>
              </div>
            )}
            <div className="flex gap-1">
              <dt>Messages:</dt>
              <dd className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                {messages.length}
                {session.scenario.max_turns ? ` / ${session.scenario.max_turns}` : ''}
              </dd>
            </div>
          </dl>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Score</p>
          <Score score={result?.score ?? null} className="text-4xl leading-tight" />
          {result && (
            <p
              className={cn(
                'mt-0.5 inline-flex items-center gap-1 text-xs font-medium',
                result.overall_pass
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {result.overall_pass ? (
                <CircleCheck className="size-3.5" aria-hidden />
              ) : (
                <CircleX className="size-3.5" aria-hidden />
              )}
              {result.overall_pass ? 'Pass' : 'Fail'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {running && (
          <Button
            variant="danger"
            icon={<Square className="size-3.5" aria-hidden />}
            onClick={() => setConfirmOpen(true)}
          >
            Stop test
          </Button>
        )}
        <Button
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={() => navigate('/run', { state: { prefill: prefillFromSession(session) } })}
        >
          Run again
        </Button>
        <Button
          icon={<Copy className="size-4" aria-hidden />}
          onClick={() => void copyTranscript()}
        >
          Copy transcript
        </Button>
        {recording && (
          <a
            href={recording}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open recording
          </a>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Stop this test?"
        message="The AI customer will stop replying and the test will be marked as stopped. It won't be graded."
        confirmLabel="Stop test"
        danger
        loading={abort.isPending}
        onConfirm={stop}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}

// ---------- Judge report ----------

function JudgeReport({ session }: { session: Session }) {
  const result = session.result;

  if (!result) {
    return (
      <Card>
        <CardHeader title="Judge report" />
        <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
          {session.status === 'running'
            ? 'The judge grades the conversation as soon as it ends.'
            : 'This test was not graded.'}
        </p>
      </Card>
    );
  }

  const checks = result.checks ?? [];
  const issues = result.issues ?? [];
  const passedCount = checks.filter((c) => c.pass).length;

  return (
    <Card>
      <CardHeader
        title="Judge report"
        description={
          result.goal_achieved === undefined
            ? undefined
            : result.goal_achieved
              ? 'Goal achieved'
              : 'Goal not achieved'
        }
      />
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {result.summary && (
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {result.summary}
          </p>
        )}

        {checks.length > 0 && (
          <Section title={`Checks · ${passedCount}/${checks.length} passed`}>
            <ul className="space-y-2.5">
              {checks.map((c, i) => (
                <li key={i} className="flex gap-2.5">
                  {c.pass ? (
                    <CircleCheck
                      className="mt-0.5 size-4 shrink-0 text-emerald-500"
                      aria-label="Passed"
                    />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-red-500" aria-label="Failed" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {c.check}
                    </p>
                    {c.reason && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{c.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {issues.length > 0 && (
          <Section title="Issues">
            <ul className="space-y-1.5">
              {issues.map((issue, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </Card>
  );
}

function ScenarioCard({ session }: { session: Session }) {
  const { persona, goal, bot_starts } = session.scenario;
  if (!persona && !goal) return null;
  return (
    <Card>
      <CardHeader
        title="Scenario"
        description={bot_starts ? 'The bot sends the first message.' : undefined}
      />
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {persona && (
          <Section title="Persona">
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {persona}
            </p>
          </Section>
        )}
        {goal && (
          <Section title="Goal">
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{goal}</p>
          </Section>
        )}
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ---------- Conversation ----------

interface ConversationProps {
  session: Session;
  messages: Message[];
  running: boolean;
}

function Conversation({ session, messages, running }: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length, running]);

  const voiceLive = running && session.channel === 'voice';
  const awaitingBotOpener =
    running && messages.length === 0 && session.scenario.bot_starts === true;
  const last = messages[messages.length - 1];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Conversation"
        description={
          <span className="inline-flex items-center gap-3">
            <Legend className="bg-zinc-200 dark:bg-zinc-700" label="AI customer" />
            <Legend className="bg-accent-600" label="Bot" />
          </span>
        }
      />
      <div
        ref={scrollRef}
        className="max-h-[70vh] min-h-[16rem] space-y-3 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {messages.length === 0 && !running && (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No messages were recorded.
          </p>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {voiceLive ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Phone className="size-5 animate-pulse text-accent-500" aria-hidden />
            Call in progress — the transcript arrives when the call ends.
          </div>
        ) : awaitingBotOpener ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <MessageSquare className="size-5 animate-pulse text-accent-500" aria-hidden />
            Waiting for the bot's first message…
          </div>
        ) : running ? (
          <TypingIndicator who={last?.role === 'tester' ? 'bot' : 'tester'} />
        ) : null}
      </div>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-full', className)} aria-hidden />
      {label}
    </span>
  );
}

function Bubble({ message }: { message: Message }) {
  const isBot = message.role === 'bot';
  return (
    <div className={cn('group flex flex-col', isBot ? 'items-end' : 'items-start')}>
      <span className="mb-0.5 px-1 text-[11px] font-medium text-zinc-400">
        {isBot ? 'Bot' : 'AI customer'}
      </span>
      <div
        title={fullDate(message.at)}
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isBot
            ? 'rounded-br-md bg-accent-600 text-white dark:bg-accent-500'
            : 'rounded-bl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
        )}
      >
        {message.content}
      </div>
      <time
        dateTime={message.at}
        className="mt-0.5 px-1 text-[11px] tabular-nums text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {shortTime(message.at)}
      </time>
    </div>
  );
}

function TypingIndicator({ who }: { who: 'bot' | 'tester' }) {
  const isBot = who === 'bot';
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400',
        isBot ? 'justify-end' : 'justify-start',
      )}
    >
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="size-1.5 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
      {isBot ? 'Waiting for bot…' : 'AI customer is typing…'}
    </div>
  );
}

// ---------- States ----------

function Missing() {
  return (
    <>
      <BackLink />
      <Card>
        <EmptyState
          icon={<FileQuestion className="size-5" aria-hidden />}
          title="Test not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Link
              to="/tests"
              className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              Back to results
            </Link>
          }
        />
      </Card>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-label="Loading test" className="space-y-4">
      <Skeleton className="h-5 w-24" />
      <Card className="space-y-3 p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-56" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
