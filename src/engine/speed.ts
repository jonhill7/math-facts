// Speed goals: one system for every game.
//
// 1 × 1 is much quicker to recall than 7 × 8, so every fact gets its own speed
// goal based on how hard it is. Beating it is what counts as "fast" everywhere:
// the triple snack, the power meter, Lantern Hunt's bright lantern, a top-corner
// shot, a diving save, and a Sky Race super flap. Sky Race and the speed titles
// also use it to measure pace fairly. (The fact map is the exception: a fact
// moves up when it's answered within the flat speed-goal setting.)
//
// The kid's speed-goal setting (3 seconds by default, the fluency standard used
// by XtraMath and Reflex) is the goal for the hardest facts. No fact's goal goes
// over it, so beating a goal always means meeting the standard.

import { Fact } from './facts';
import { DEFAULT_FAST_MS } from './scheduler';

// How hard a times table is to recall, from 0 (patterns like × 1, × 2, × 10)
// to 3 (the facts kids find hardest).
export const TIER: Record<number, number> = { 1: 0, 2: 0, 10: 0, 5: 1, 11: 1, 3: 2, 4: 2, 9: 2, 6: 3, 7: 3, 8: 3, 12: 3 };

// The speed goal in ms for a fact. The easier factor counts most, because kids
// use it as the strategy: 2 × 7 is a double.
export function speedGoalMs(fact: Fact, fastMs = DEFAULT_FAST_MS): number {
  const lo = Math.min(TIER[fact.a], TIER[fact.b]);
  const hi = Math.max(TIER[fact.a], TIER[fact.b]);
  const square = fact.a === fact.b ? -200 : 0; // doubles like 6 × 6 are easier to remember
  const division = fact.op === 'div' ? 600 : 0;
  const ms = Math.min(DEFAULT_FAST_MS, 1400 + lo * 350 + hi * 250 + square + division);
  return Math.round((ms * fastMs) / DEFAULT_FAST_MS);
}

// A right answer that beat the fact's speed goal.
export const beatGoal = (fact: Fact, correct: boolean, ms: number, fastMs?: number) => correct && ms <= speedGoalMs(fact, fastMs);

// Seconds for showing a time to a kid, like "1.8".
export const seconds = (ms: number) => (ms / 1000).toFixed(1);
