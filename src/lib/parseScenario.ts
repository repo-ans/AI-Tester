/**
 * Turns one pasted block of text (usually an AI's write-up of a test) into the
 * scenario fields. Understands labelled sections in plain text or markdown
 * ("Persona:", "## Goal", "**Checks**" …) and JSON objects.
 */

export interface ParsedScenario {
  name?: string;
  persona?: string;
  goal?: string;
  checks?: string[];
  max_turns?: number;
}

type Section = 'name' | 'persona' | 'goal' | 'checks' | 'max_turns' | 'opening';

// Order matters: longer, more specific labels first.
const LABELS: Array<[Section, string[]]> = [
  [
    'name',
    [
      'test name',
      'scenario name',
      'test case name',
      'test title',
      'title',
      'test case',
      'scenario',
    ],
  ],
  [
    'checks',
    [
      'checks to grade',
      'judge checks',
      'checks',
      'pass/fail criteria',
      'pass criteria',
      'success criteria',
      'acceptance criteria',
      'evaluation criteria',
      'expected behaviour / pass criteria',
      'expected behavior / pass criteria',
      'expected behaviour',
      'expected behavior',
      'expected results',
      'expected result',
      'what to check',
      'criteria',
      'assertions',
    ],
  ],
  [
    'opening',
    [
      'sample caller lines',
      'sample caller line',
      'opening line',
      'opening message',
      'first message',
      'first text',
      'caller line',
      'opener',
    ],
  ],
  ['max_turns', ['max messages', 'max turns', 'max_turns', 'message limit', 'turn limit']],
  [
    'persona',
    [
      'customer persona',
      'caller persona',
      'tester persona',
      'ai customer',
      'customer profile',
      'persona',
      'customer',
      'caller',
      'character',
      'background',
    ],
  ],
  [
    'goal',
    ['customer goal', 'caller goal', 'test goal', 'goal', 'objective', 'aim', 'intent', 'task'],
  ],
];

const ALIASES = LABELS.flatMap(([section, words]) => words.map((w) => [section, w] as const)).sort(
  (a, b) => b[1].length - a[1].length,
);

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const LABEL_RE = new RegExp(
  // optional "## ", "1. ", "- ", bold/italic markers, the label, markers, then ":" "-" "—" or end of line
  String.raw`^\s*(?:#{1,6}\s*|\d+[.)]\s*|[-*•]\s*)?(?:\*\*|__|\*|_)?\s*(` +
    ALIASES.map(([, w]) => escape(w)).join('|') +
    String.raw`)\s*(?:\(s\))?\s*(?:\*\*|__|\*|_)?\s*(?:[:：]|\s[-–—]\s|$)\s*(?:\*\*|__)?\s*(.*)$`,
  'i',
);

function sectionFor(label: string): Section | undefined {
  const l = label.toLowerCase();
  return ALIASES.find(([, w]) => w === l)?.[0];
}

/** Strips list markers, checkboxes and quotes from one check line. */
function cleanItem(line: string): string {
  return line
    .replace(/^\s*(?:[-*•✓✔☐☑]|\[[ xX]?\]|\d+[.)]|[a-z][.)])\s*/, '')
    .replace(/^\s*(?:\[[ xX]?\]|[✓✔☐☑])\s*/, '')
    .replace(/\*\*|__/g, '')
    .trim();
}

function cleanText(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/\*\*|__/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unquote(s: string): string {
  return s
    .trim()
    .replace(/^["“'`]+|["”'`]+$/g, '')
    .trim();
}

function fromJson(text: string): ParsedScenario | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = obj[k];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return undefined;
    };
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
    const checks = pick('checks', 'pass_criteria', 'criteria', 'expected_behavior');
    const max = Number(pick('max_turns', 'max_messages'));
    const parsed: ParsedScenario = {
      name: str(pick('name', 'test_name', 'title', 'scenario')),
      persona: str(pick('persona', 'customer', 'caller')),
      goal: str(pick('goal', 'objective')),
      checks: Array.isArray(checks)
        ? checks.map((c) => String(c).trim()).filter(Boolean)
        : typeof checks === 'string'
          ? checks.split('\n').map(cleanItem).filter(Boolean)
          : undefined,
      max_turns: Number.isFinite(max) ? max : undefined,
    };
    return parsed.persona || parsed.goal || parsed.checks ? parsed : null;
  } catch {
    return null;
  }
}

export function parseScenario(raw: string): ParsedScenario {
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/```[a-z]*\n?/gi, '')
    .trim();
  if (!text) return {};

  const json = fromJson(text);
  if (json) return json;

  const buckets: Partial<Record<Section, string[]>> = {};
  let current: Section | null = null;
  const preamble: string[] = [];

  for (const line of text.split('\n')) {
    const m = LABEL_RE.exec(line);
    const section = m?.[1] ? sectionFor(m[1]) : undefined;
    if (section) {
      current = section;
      buckets[section] ??= [];
      const rest = m?.[2]?.trim();
      if (rest) buckets[section].push(rest);
      continue;
    }
    if (current) buckets[current]?.push(line);
    else preamble.push(line);
  }

  const result: ParsedScenario = {};
  const found = Object.keys(buckets).length > 0;

  // Nothing labelled: treat the whole paste as the persona.
  if (!found) {
    result.persona = cleanText(preamble);
    return result;
  }

  if (buckets.name) {
    const first = buckets.name.map((l) => l.trim()).find(Boolean);
    if (first) result.name = unquote(first.replace(/\*\*|__/g, ''));
  } else {
    // An unlabelled first line like "# Booking test" is a good name.
    const heading = preamble.map((l) => l.trim()).find(Boolean);
    if (heading && heading.length <= 80)
      result.name = unquote(heading.replace(/^#+\s*|\*\*|__/g, ''));
  }

  const personaParts: string[] = [];
  if (buckets.persona) personaParts.push(cleanText(buckets.persona));
  if (buckets.opening) {
    const opening = unquote(cleanText(buckets.opening).split('\n')[0] ?? '');
    if (opening) personaParts.push(`Your first message is exactly: "${opening}"`);
  }
  if (personaParts.length) result.persona = personaParts.filter(Boolean).join('\n');

  if (buckets.goal) result.goal = cleanText(buckets.goal);

  if (buckets.checks) {
    const items = buckets.checks.map(cleanItem).filter(Boolean);
    if (items.length) result.checks = items;
  }

  if (buckets.max_turns) {
    const n = Number(/\d+/.exec(buckets.max_turns.join(' '))?.[0]);
    if (Number.isFinite(n)) result.max_turns = Math.min(30, Math.max(2, n));
  }

  return result;
}

/** A prompt teammates can give their AI so its output pastes cleanly. */
export const PASTE_FORMAT_PROMPT = `Write the test in exactly this format (plain text, keep the labels):

Test name: <short name>
Max messages: <number 2-30>
Persona:
<who the AI customer is: name, phone, email, address, problem, mood, how to push back, the exact first message>
Goal:
<the one thing the customer wants to get done>
Checks:
- <one yes/no behaviour the judge should verify>
- <another check>`;
