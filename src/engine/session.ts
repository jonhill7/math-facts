import { ALL_FACTS, difficulty, Fact } from './facts';
import { tableFactIds } from './dragons';
import { isDue, Progress } from './scheduler';

export interface SessionOptions {
  length?: number; // questions in a session
  maxNew?: number; // new facts per session once the kid has some history
  maxLearning?: number; // stop adding new facts if this many are still in box 1
  focusTable?: number; // practice only this times table (and its division facts)
  only?: (fact: Fact) => boolean; // practice only facts that pass this (a Sky Race course)
  random?: () => number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Facts the kid has never seen, easiest first. Division for a fact unlocks
// once its multiplication partner is out of box 1.
export function newFactCandidates(progress: Progress): Fact[] {
  return ALL_FACTS.filter((f) => {
    if (progress[f.id]) return false;
    if (f.op === 'div') {
      const partner = progress[`mul:${f.a}:${f.b}`];
      return partner !== undefined && partner.box >= 2;
    }
    return true;
  }).sort((x, y) => difficulty(x) - difficulty(y));
}

// Build today's list of questions: due reviews first, a few new facts mixed in,
// then extra practice on the least-known facts if there's room.
export function buildSession(progress: Progress, now: number, opts: SessionOptions = {}): Fact[] {
  const { length = 20, maxLearning = 8, focusTable, random = Math.random } = opts;
  // Focus practice (say, for homework on the 7s) allows more new facts at once.
  const table = focusTable ? new Set(tableFactIds(focusTable)) : null;
  const focus = table || opts.only ? true : null;
  const maxNew = opts.maxNew ?? (focus ? 6 : 3);
  const inPool = (f: Fact) => (!table || table.has(f.id)) && (!opts.only || opts.only(f));
  const seen = ALL_FACTS.filter((f) => progress[f.id] && inPool(f));

  const due = seen
    .filter((f) => isDue(progress[f.id], now))
    .sort((x, y) => progress[x.id].box - progress[y.id].box || progress[x.id].due - progress[y.id].due);

  const reviews = due.slice(0, length);
  const learningCount = seen.filter((f) => progress[f.id].box === 1).length;
  const candidates = newFactCandidates(progress).filter(inPool);

  let fresh: Fact[];
  if (seen.length === 0) {
    // First session is a placement check: sample easy to hard facts. Facts the
    // kid answers fast jump ahead, so nobody grinds through what they know.
    const count = Math.min(length, candidates.length);
    const step = candidates.length / count;
    fresh = Array.from({ length: count }, (_, i) => candidates[Math.floor(i * step)]);
  } else {
    const newCount = learningCount >= maxLearning ? 0 : Math.min(maxNew, length - reviews.length);
    fresh = candidates.slice(0, Math.max(0, newCount));
  }

  let picked = [...reviews, ...fresh];
  if (picked.length < length) {
    // Extra practice: lowest box first, least recently seen first.
    const extra = seen
      .filter((f) => !picked.includes(f))
      .sort((x, y) => progress[x.id].box - progress[y.id].box || progress[x.id].lastSeen - progress[y.id].lastSeen);
    picked = [...picked, ...extra.slice(0, length - picked.length)];
  }
  if (picked.length > 0 && picked.length < length) {
    // Not enough known facts to fill the game (a new course, or a table that's
    // mostly new): go round the same few facts again rather than piling on more
    // new ones than the limit. Repeats help new facts stick, and they don't
    // count twice toward mastered (facts move up at most once a day).
    return inRounds(picked, length, random);
  }

  // Mix everything so new facts are spread among known ones.
  return shuffle(picked.slice(0, length), random);
}

// The same few facts, shuffled round after round until there are enough,
// never the same fact twice in a row.
export function inRounds(facts: Fact[], length: number, random: () => number = Math.random): Fact[] {
  if (facts.length === 0) return [];
  const rounds: Fact[] = [];
  while (rounds.length < length) {
    let round = shuffle(facts, random);
    if (rounds.length && round.length > 1 && round[0] === rounds[rounds.length - 1]) round = [...round.slice(1), round[0]];
    rounds.push(...round);
  }
  return rounds.slice(0, length);
}

// After a miss, the same fact comes back a few questions later.
export const RETRY_GAP = 3;

// So a hard day doesn't make the game drag on: each fact comes back at most
// twice, and a game gets at most 5 extra questions. Facts still missed are back
// in box 1, so they're first in line next time.
export const MAX_RETRIES_PER_FACT = 2;
export const MAX_RETRIES = 5;

// Whether a missed fact should come back this game, given the questions
// already added back (one entry per retry).
export function canRetry(retried: string[], fact: Fact): boolean {
  return retried.length < MAX_RETRIES && retried.filter((id) => id === fact.id).length < MAX_RETRIES_PER_FACT;
}

export function requeueMiss(queue: Fact[], index: number): Fact[] {
  const fact = queue[index];
  const next = [...queue];
  next.splice(Math.min(index + 1 + RETRY_GAP, next.length), 0, fact);
  return next;
}
