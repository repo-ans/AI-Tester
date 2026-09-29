import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionRow } from '@/api/client';
import { fullDate } from '@/lib/format';

const HEIGHT = 140;
const PAD = { top: 12, right: 12, bottom: 20, left: 30 };
const GRID = [0, 60, 80, 100];

interface Point {
  row: SessionRow;
  x: number;
  y: number;
}

/** Line of scores for the last 30 finished tests (oldest → newest). */
export function ScoreTrend({ rows }: { rows: SessionRow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () =>
      rows
        .filter((r) => r.status !== 'running' && r.score !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-30),
    [rows],
  );

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const yOf = (score: number) =>
    PAD.top + plotH - (Math.min(100, Math.max(0, score)) / 100) * plotH;

  const points: Point[] = data.map((row, i) => ({
    row,
    x: PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: yOf(row.score ?? 0),
  }));

  if (points.length < 2) {
    return (
      <div ref={wrapRef} className="relative px-1">
        <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          The score trend appears after two finished tests.
        </p>
      </div>
    );
  }

  const path = points
    .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const hovered = active !== null ? points[active] : undefined;

  const pickNearest = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs((points[best]?.x ?? 0) - x)) best = i;
    });
    setActive(best);
  };

  return (
    <div ref={wrapRef} className="relative px-1">
      <svg
        width={width}
        height={HEIGHT}
        className="block max-w-full"
        role="img"
        aria-label={`Scores of the last ${points.length} finished tests`}
      >
        {GRID.map((g) => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={yOf(g)}
              y2={yOf(g)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeDasharray={g === 0 ? undefined : '3 4'}
            />
            <text
              x={PAD.left - 6}
              y={yOf(g)}
              dy="0.32em"
              textAnchor="end"
              className="fill-zinc-400 text-[10px] tabular-nums dark:fill-zinc-500"
            >
              {g}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 4} className="fill-zinc-400 text-[10px] dark:fill-zinc-500">
          Oldest
        </text>
        <text
          x={width - PAD.right}
          y={HEIGHT - 4}
          textAnchor="end"
          className="fill-zinc-400 text-[10px] dark:fill-zinc-500"
        >
          Newest
        </text>

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PAD.top}
            y2={PAD.top + plotH}
            className="stroke-zinc-300 dark:stroke-zinc-700"
          />
        )}
        <path
          d={path}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-accent-500 dark:stroke-accent-400"
        />
        {points.map((p, i) => (
          <circle
            key={p.row.id}
            cx={p.x}
            cy={p.y}
            r={i === active ? 5 : 4}
            strokeWidth={2}
            className="fill-accent-500 stroke-white dark:fill-accent-400 dark:stroke-zinc-900"
          />
        ))}
        {/* Hit area larger than the marks */}
        <rect
          x={0}
          y={0}
          width={width}
          height={HEIGHT}
          fill="transparent"
          className="cursor-pointer"
          onPointerMove={(e) => pickNearest(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onClick={() => hovered && navigate(`/tests/${hovered.row.id}`)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-52 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            left: Math.min(Math.max(hovered.x - 104, 0), width - 208),
            transform: hovered.y < HEIGHT / 2 ? `translateY(${hovered.y + 14}px)` : undefined,
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              #{hovered.row.id} {hovered.row.name ?? 'Untitled'}
            </span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {hovered.row.score}
            </span>
          </div>
          <div className="mt-0.5 text-zinc-500 dark:text-zinc-400">
            {fullDate(hovered.row.created_at)}
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>Scores of recent finished tests</caption>
        <thead>
          <tr>
            <th>Test</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.row.id}>
              <td>
                #{p.row.id} {p.row.name}
              </td>
              <td>{p.row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
