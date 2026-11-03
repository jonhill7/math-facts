// Spaced repetition with Leitner boxes.
//
// Every fact lives in a box from 1 to 5:
//   box 1 = still learning, practiced every session
//   box 5 = mastered, checked again in 3 weeks
// A correct AND fast answer moves the fact up a box and waits longer before
// asking again. A wrong answer sends it back to box 1. A correct but slow
// answer keeps it where it is.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MASTERED_BOX = 5;

// How many days to wait before asking again, by box.
export const WAIT_DAYS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };

// Answers faster than this count as "fluent" (recalled, not counted out).
export const DEFAULT_FAST_MS = 3000;

export interface FactState {
  box: number;
  due: number; // time (ms) when it should be practiced again
  seen: number;
  correct: number;
  avgMs: number; // average time for correct answers
  lastSeen: number;
}

export type Progress = Record<string, FactState>;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueAfter(box: number, now: number): number {
  const days = WAIT_DAYS[box] ?? 0;
  return days === 0 ? now : startOfDay(now) + days * DAY_MS;
}

export function recordAnswer(
  prev: FactState | undefined,
  correct: boolean,
  ms: number,
  now: number,
  fastMs = DEFAULT_FAST_MS,
): FactState {
  const isNew = prev === undefined;
  const seen = (prev?.seen ?? 0) + 1;
  const correctCount = (prev?.correct ?? 0) + (correct ? 1 : 0);
  const avgMs = correct
    ? prev && prev.correct > 0
      ? Math.round((prev.avgMs * prev.correct + ms) / correctCount)
      : ms
    : prev?.avgMs ?? 0;

  let box: number;
  if (!correct) {
    box = 1;
  } else if (ms <= fastMs) {
    // A brand-new fact answered fast is probably already known: skip ahead.
    box = isNew ? 3 : Math.min(MASTERED_BOX, prev.box + 1);
  } else {
    box = prev?.box ?? 1;
  }

  return { box, due: dueAfter(box, now), seen, correct: correctCount, avgMs, lastSeen: now };
}

export function isDue(state: FactState, now: number): boolean {
  return state.due <= now;
}

// The facts a kid is most stuck on: missed often, still in a low box, or slow.
// Parents see these on the fact map.
export function troubleFacts(progress: Progress, limit = 8): { id: string; state: FactState }[] {
  const score = (s: FactState) => (s.seen - s.correct) * 2 + (s.box <= 1 ? 3 : s.box === 2 ? 1 : 0) + s.avgMs / 2000;
  return Object.entries(progress)
    .filter(([, s]) => s.box < 4 && (s.seen > s.correct || s.box <= 2))
    .map(([id, state]) => ({ id, state }))
    .sort((a, b) => score(b.state) - score(a.state))
    .slice(0, limit);
}
