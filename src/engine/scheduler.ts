// Spaced repetition with Leitner boxes.
//
// Every fact lives in a box from 1 to 5:
//   box 1 = still learning, practiced every session
//   box 5 = mastered, checked again in 3 weeks
// A correct AND fast answer moves the fact up a box and waits longer before
// asking again. A correct but slow answer still counts: it moves a fact out of
// box 1 ("can solve it"), but only fast answers move it further ("can recall it").
//
// Moving up takes evidence from different days: a fact moves up at most once a
// day, and not on a day it was missed, so repeating it in one sitting can't
// rush it to mastered. (Box 1 to box 2 is the exception: that only means "check
// again tomorrow".)
//
// A miss sends a fact back to box 1. One slip on a fact that was Strong or
// Mastered sends it to box 2 instead, a short review rather than starting over.
// A fact answered fast the very first time (it was already known) jumps to
// box 3, and if it's fast again at its next check a few days later it goes
// straight to mastered.
// An answer given after asking for help is practice, not proof: it never moves
// a fact up.

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
  stepDay?: number; // start of the day the fact last changed box
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
  helped = false,
): FactState {
  const isNew = prev === undefined;
  const today = startOfDay(now);
  const steppedToday = prev?.stepDay === today;
  const seen = (prev?.seen ?? 0) + 1;
  const correctCount = (prev?.correct ?? 0) + (correct ? 1 : 0);
  const timed = correct && !helped; // help time isn't recall time
  const avgMs = timed
    ? prev && prev.correct > 0 && prev.avgMs > 0
      ? Math.round((prev.avgMs * prev.correct + ms) / correctCount)
      : ms
    : prev?.avgMs ?? 0;

  const was = prev?.box ?? 1;
  let box: number;
  if (!correct) {
    box = was >= 4 ? 2 : 1;
  } else if (isNew) {
    // A brand-new fact answered fast is probably already known: skip ahead.
    box = !helped && ms <= fastMs ? 3 : 1;
  } else if (helped) {
    box = was;
  } else if (was === 1) {
    box = 2; // right, fast or slow: it can be solved, so check it again tomorrow
  } else if (ms <= fastMs && !steppedToday && was === 3 && prev.seen === 1) {
    // Fast the first time and fast again on a later day: a fact the kid
    // already knew. It goes straight to mastered rather than climbing.
    box = MASTERED_BOX;
  } else if (ms <= fastMs && !steppedToday) {
    box = Math.min(MASTERED_BOX, was + 1);
  } else {
    box = was;
  }

  const moved = isNew || box !== was;
  const stepDay = moved ? today : prev?.stepDay;
  return { box, due: dueAfter(box, now), seen, correct: correctCount, avgMs, lastSeen: now, ...(stepDay !== undefined && { stepDay }) };
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
