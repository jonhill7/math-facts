// Sky Race: a race game where every right answer is one flap toward the
// finish line. Kids race their own ghost, a rival dragon, or fly solo.
//
// Fairness: 1 × 1 is much quicker than 7 × 8, so racers are never compared on
// raw times. Every fact has a "fair time" based on how hard it is, and racers
// are measured as a pace: how long they take compared with the fair time.
// Rivals and ghosts fly at a pace, so they slow down on hard facts too.

import { Fact } from './facts';
import { DEFAULT_FAST_MS, Progress } from './scheduler';

// How hard a times table is to recall, from 0 (patterns like × 1, × 2, × 10)
// to 3 (the facts kids find hardest).
const TIER: Record<number, number> = { 1: 0, 2: 0, 10: 0, 5: 1, 11: 1, 3: 2, 4: 2, 9: 2, 6: 3, 7: 3, 8: 3, 12: 3 };

// A fair time in ms for a fact at the standard 3 second speed goal. The easier
// factor counts most, because kids use it as the strategy: 2 × 7 is a double.
// No fair time goes over the speed goal (the fluency standard, about 3 seconds
// as in XtraMath and Reflex), so beating it always means meeting the standard.
export function fairTimeMs(fact: Fact, fastMs = DEFAULT_FAST_MS): number {
  const lo = Math.min(TIER[fact.a], TIER[fact.b]);
  const hi = Math.max(TIER[fact.a], TIER[fact.b]);
  const square = fact.a === fact.b ? -200 : 0; // doubles like 6 × 6 are easier to remember
  const division = fact.op === 'div' ? 600 : 0;
  const ms = Math.min(DEFAULT_FAST_MS, 1400 + lo * 350 + hi * 250 + square + division);
  return Math.round((ms * fastMs) / DEFAULT_FAST_MS);
}

// Rival dragons, slowest first. Beat one to unlock the next.
// pace = how many fair times they take per fact (1 = exactly the fair time).
export interface Rival {
  name: string;
  species: number; // which dragon drawing they fly as
  pace: number;
}

export const RIVALS: Rival[] = [
  { name: 'Dozy the Pebble Wyrm', species: 1, pace: 1.9 },
  { name: 'Puddle the Twin-Tail', species: 2, pace: 1.6 },
  { name: 'Breezy the Starfin', species: 5, pace: 1.35 },
  { name: 'Zippy the Quadwing', species: 4, pace: 1.15 },
  { name: 'Flicker the Hexscale', species: 6, pace: 1.0 },
  { name: 'Comet the Mirror Drake', species: 11, pace: 0.85 },
  { name: 'Thunder the Tenpeak Titan', species: 10, pace: 0.72 },
];

export type RaceKind = 'ghost' | 'rival' | 'solo';

export interface RaceState {
  ghost: number[]; // the kid's pace on each flap of their last race
  rivalsBeaten: number; // how far up the rival ladder they've got
  bestPace: number; // best (lowest) race pace so far; 0 = never raced
  races: number;
  golds: number; // solo flights that beat the fair time
}

export const emptyRace = (): RaceState => ({ ghost: [], rivalsBeaten: 0, bestPace: 0, races: 0, golds: 0 });

// The next rival to beat, or the fastest one once all are beaten.
export const nextRival = (race: RaceState): number => Math.min(race.rivalsBeaten, RIVALS.length - 1);

// A wrong answer is a stumble: it costs one extra fair time on top of the
// time spent, since the fix-up time after a miss isn't counted.
export const STUMBLE = 1;

// One flap = one right answer. Its time includes any misses before it.
export interface Flap {
  fact: Fact;
  ms: number;
}

// How long a racer at this pace takes for each flap.
export function opponentTimes(flaps: Fact[], paces: number | number[], fastMs?: number): number[] {
  return flaps.map((f, i) => {
    const pace = Array.isArray(paces) ? (paces[i] ?? average(paces)) : paces;
    return fairTimeMs(f, fastMs) * pace;
  });
}

function average(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1;
}

// The kid's pace on each flap, saved as next race's ghost.
export const flapPaces = (flaps: Flap[], fastMs?: number): number[] => flaps.map((f) => round2(f.ms / fairTimeMs(f.fact, fastMs)));

// Overall pace for a whole race: total time over total fair time.
export function racePace(flaps: Flap[], fastMs?: number): number {
  const fair = flaps.reduce((t, f) => t + fairTimeMs(f.fact, fastMs), 0);
  const took = flaps.reduce((t, f) => t + f.ms, 0);
  return fair ? round2(took / fair) : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// How many flaps an opponent has done by this time, with a fraction for the
// one in progress. Flaps past what the kid has reached use `upcoming` (the
// fact the kid is on now), since nobody knows the later questions yet.
export function opponentProgress(doneTimes: number[], upcomingMs: number, elapsedMs: number, finish: number): number {
  let t = 0;
  for (let i = 0; i < finish; i++) {
    const step = doneTimes[i] ?? upcomingMs;
    if (t + step > elapsedMs) return i + (elapsedMs - t) / step;
    t += step;
  }
  return finish;
}

// Solo medals: gold for beating the fair time overall.
export type Medal = 'gold' | 'silver' | 'bronze';
export const medalFor = (pace: number): Medal => (pace <= 1 ? 'gold' : pace <= 1.3 ? 'silver' : 'bronze');

export interface RaceResult {
  kind: RaceKind;
  pace: number;
  won: boolean; // beat the ghost or rival; for solo, earned gold
  medal: Medal;
  newBest: boolean;
  rival?: string;
  margin: number; // seconds ahead (positive) or behind (negative) at the finish
}

export function finishRace(race: RaceState, kind: RaceKind, flaps: Flap[], opponentMs: number, fastMs?: number): { race: RaceState; result: RaceResult } {
  const pace = racePace(flaps, fastMs);
  const took = flaps.reduce((t, f) => t + f.ms, 0);
  const medal = medalFor(pace);
  const won = kind === 'solo' ? medal === 'gold' : took < opponentMs;
  const newBest = flaps.length > 0 && (race.bestPace === 0 || pace < race.bestPace);
  const rival = kind === 'rival' ? RIVALS[nextRival(race)].name : undefined;
  const next: RaceState = {
    ghost: flaps.length ? flapPaces(flaps, fastMs) : race.ghost,
    rivalsBeaten: kind === 'rival' && won ? Math.min(RIVALS.length, race.rivalsBeaten + 1) : race.rivalsBeaten,
    bestPace: newBest ? pace : race.bestPace,
    races: race.races + 1,
    golds: race.golds + (kind === 'solo' && won ? 1 : 0),
  };
  return { race: next, result: { kind, pace, won, medal, newBest, rival, margin: round2((opponentMs - took) / 1000) } };
}

// Speed titles, earned from how fast the kid usually answers compared with the
// fair time. Because it's a pace, moving on to harder tables doesn't lower it.
// A title is earned once the kid's pace is at or under its `pace`.
export const SPEED_TITLES = [
  { name: 'Egg Wobbler', icon: '🥚', pace: Infinity },
  { name: 'Nest Hopper', icon: '🪺', pace: 1.7 },
  { name: 'Cloud Glider', icon: '☁️', pace: 1.35 },
  { name: 'Sky Dasher', icon: '💨', pace: 1.1 },
  { name: 'Storm Rider', icon: '⛈️', pace: 0.9 },
  { name: 'Comet Wing', icon: '☄️', pace: 0.75 },
];

export const MIN_FACTS_FOR_TITLE = 10;

export interface SpeedTitle {
  name: string;
  icon: string;
  pace: number;
  next?: string; // the title above this one
}

// The kid's usual pace across every fact they've answered right, weighted by
// how often they've seen it. Null until they've got enough facts to judge.
export function speedTitle(progress: Progress, facts: Fact[], fastMs?: number): SpeedTitle | null {
  let fair = 0;
  let took = 0;
  let count = 0;
  for (const f of facts) {
    const s = progress[f.id];
    if (!s || s.correct === 0 || !s.avgMs) continue;
    fair += fairTimeMs(f, fastMs) * s.correct;
    took += s.avgMs * s.correct;
    count++;
  }
  if (count < MIN_FACTS_FOR_TITLE) return null;
  const pace = round2(took / fair);
  let i = 0;
  while (i + 1 < SPEED_TITLES.length && pace <= SPEED_TITLES[i + 1].pace) i++;
  const title = SPEED_TITLES[i];
  return { name: title.name, icon: title.icon, pace, next: SPEED_TITLES[i + 1]?.name };
}
