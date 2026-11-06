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

// Courses: kids race on facts of one difficulty, so a race on the 2s is never
// compared with a race on the 7s. A fact's course comes from its easier factor,
// the one kids use as the strategy (2 × 7 is a double, so it's easy).
export type CourseId = 'easy' | 'medium' | 'hard' | 'mixed';

export const COURSES: { id: CourseId; name: string; icon: string; tables: string }[] = [
  { id: 'easy', name: 'Easy', icon: '🌱', tables: '1s, 2s, 5s, 10s and 11s' },
  { id: 'medium', name: 'Medium', icon: '🌤️', tables: '3s, 4s and 9s' },
  { id: 'hard', name: 'Hard', icon: '⛰️', tables: '6s, 7s, 8s and 12s' },
  { id: 'mixed', name: 'Mixed', icon: '🎲', tables: 'every fact' },
];

export function courseOf(fact: Fact): Exclude<CourseId, 'mixed'> {
  const lo = Math.min(TIER[fact.a], TIER[fact.b]);
  return lo <= 1 ? 'easy' : lo === 2 ? 'medium' : 'hard';
}

export const courseFacts = (course: CourseId, facts: Fact[]): Fact[] => (course === 'mixed' ? facts : facts.filter((f) => courseOf(f) === course));

// The usual fair time on a course: what a rival flies each flap at pace 1.
export function courseFairMs(course: CourseId, facts: Fact[], fastMs?: number): number {
  const on = courseFacts(course, facts);
  return on.reduce((t, f) => t + fairTimeMs(f, fastMs), 0) / on.length;
}

export interface RaceState {
  ghosts: Partial<Record<CourseId, number[]>>; // ms for each flap of the last race on each course
  course: CourseId; // the course picked last
  rivalsBeaten: number; // how far up the rival ladder they've got
  bestPace: number; // best (lowest) race pace so far; 0 = never raced
  races: number;
  golds: number; // solo flights that beat the fair time
}

export const emptyRace = (): RaceState => ({ ghosts: {}, course: 'mixed', rivalsBeaten: 0, bestPace: 0, races: 0, golds: 0 });

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

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

// The ghost flies exactly as the kid did last time: the same time for each
// flap. If this race is longer, the extra flaps take its average time.
export function ghostFlaps(ghost: number[], finish: number): number[] {
  const avg = average(ghost);
  return Array.from({ length: finish }, (_, i) => ghost[i] ?? avg);
}

// A rival flaps at its pace on the course's usual fair time, a little quicker
// or slower each flap like a real flier (between 0.75 and 1.3 times).
export function rivalFlaps(pace: number, courseMs: number, finish: number, random: () => number = Math.random): number[] {
  return Array.from({ length: finish }, () => Math.round(courseMs * pace * (0.75 + random() * 0.55)));
}

// How many flaps an opponent has finished by this point in the race.
export function flapsBy(times: number[], elapsedMs: number): number {
  let t = 0;
  for (let i = 0; i < times.length; i++) {
    t += times[i];
    if (t > elapsedMs) return i;
  }
  return times.length;
}

// Overall pace for a whole race: total time over total fair time.
export function racePace(flaps: Flap[], fastMs?: number): number {
  const fair = flaps.reduce((t, f) => t + fairTimeMs(f.fact, fastMs), 0);
  const took = flaps.reduce((t, f) => t + f.ms, 0);
  return fair ? round2(took / fair) : 0;
}

// Solo medals: gold for beating the fair time overall.
export type Medal = 'gold' | 'silver' | 'bronze';
export const medalFor = (pace: number): Medal => (pace <= 1 ? 'gold' : pace <= 1.3 ? 'silver' : 'bronze');

export interface RaceResult {
  kind: RaceKind;
  course: CourseId;
  pace: number;
  won: boolean; // beat the ghost or rival; for solo, earned gold
  medal: Medal;
  newBest: boolean;
  rival?: string;
  margin: number; // seconds ahead (positive) or behind (negative) at the finish
}

export function finishRace(race: RaceState, kind: RaceKind, course: CourseId, flaps: Flap[], opponent: number[], fastMs?: number): { race: RaceState; result: RaceResult } {
  const pace = racePace(flaps, fastMs);
  const took = flaps.reduce((t, f) => t + f.ms, 0);
  const opponentMs = kind === 'solo' ? Infinity : opponent.reduce((a, b) => a + b, 0);
  const medal = medalFor(pace);
  const won = kind === 'solo' ? medal === 'gold' : took < opponentMs;
  const newBest = flaps.length > 0 && (race.bestPace === 0 || pace < race.bestPace);
  const rival = kind === 'rival' ? RIVALS[nextRival(race)].name : undefined;
  const next: RaceState = {
    ...race,
    course,
    ghosts: flaps.length ? { ...race.ghosts, [course]: flaps.map((f) => Math.round(f.ms)) } : race.ghosts,
    rivalsBeaten: kind === 'rival' && won ? Math.min(RIVALS.length, race.rivalsBeaten + 1) : race.rivalsBeaten,
    bestPace: newBest ? pace : race.bestPace,
    races: race.races + 1,
    golds: race.golds + (kind === 'solo' && won ? 1 : 0),
  };
  return { race: next, result: { kind, course, pace, won, medal, newBest, rival, margin: kind === 'solo' ? 0 : round2((opponentMs - took) / 1000) } };
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
