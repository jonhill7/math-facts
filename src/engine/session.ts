import { ALL_FACTS, difficulty, Fact } from './facts';
import { isDue, Progress } from './scheduler';

export interface SessionOptions {
  length?: number; // questions in a session
  maxNew?: number; // new facts per session once the kid has some history
  maxLearning?: number; // stop adding new facts if this many are still in box 1
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
  const { length = 20, maxNew = 3, maxLearning = 8, random = Math.random } = opts;
  const seen = ALL_FACTS.filter((f) => progress[f.id]);

  const due = seen
    .filter((f) => isDue(progress[f.id], now))
    .sort((x, y) => progress[x.id].box - progress[y.id].box || progress[x.id].due - progress[y.id].due);

  const reviews = due.slice(0, length);
  const learningCount = seen.filter((f) => progress[f.id].box === 1).length;
  const candidates = newFactCandidates(progress);

  let fresh: Fact[];
  if (seen.length === 0) {
    // First session is a placement check: sample easy to hard facts. Facts the
    // kid answers fast jump ahead, so nobody grinds through what they know.
    const step = candidates.length / length;
    fresh = Array.from({ length }, (_, i) => candidates[Math.floor(i * step)]);
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
  if (picked.length < length) {
    const more = candidates.filter((f) => !picked.includes(f));
    picked = [...picked, ...more.slice(0, length - picked.length)];
  }

  // Mix everything so new facts are spread among known ones.
  return shuffle(picked.slice(0, length), random);
}

// After a miss, the same fact comes back a few questions later.
export const RETRY_GAP = 3;

export function requeueMiss(queue: Fact[], index: number): Fact[] {
  const fact = queue[index];
  const next = [...queue];
  next.splice(Math.min(index + 1 + RETRY_GAP, next.length), 0, fact);
  return next;
}
