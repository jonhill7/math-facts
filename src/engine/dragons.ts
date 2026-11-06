import { ALL_FACTS } from './facts';

// Dragons grow from practice. The kid's companion (an egg or a dragon) eats a
// snack for every right answer, and those snacks are its experience. More
// experience means a higher level, and levels hatch and grow it:
//   egg       -> levels 1-2
//   hatchling -> levels 3-5
//   young     -> levels 6-9
//   grown     -> level 10 and up
// A grown dragon keeps going and earns ranks: Elder at level 20 and Ancient at
// level 30, the top level. Each rank has its own glow and makes the dragon's
// power stronger (see abilities.ts).
// The kid starts with one egg and finds another every so often as they
// practice, with a longer wait for each egg than the last.

export type Stage = 'none' | 'egg' | 'hatchling' | 'young' | 'grown';
export const STAGES: Stage[] = ['none', 'egg', 'hatchling', 'young', 'grown'];

export interface Species {
  id: number; // also the key for the name a kid gives it
  name: string;
  hue: number; // the dragon's main color, as a hue in degrees
  sat?: number; // color strength in %, for stony or steely dragons
  power: string;
}

export const SPECIES: Species[] = [
  { id: 1, name: 'Pebble Wyrm', hue: 28, sat: 40, power: 'Never changes, never forgets.' },
  { id: 2, name: 'Twin-Tail', hue: 170, power: 'Swishes two tails when it is happy.' },
  { id: 3, name: 'Thornback', hue: 85, power: 'Hides in bushes with its spiky back.' },
  { id: 4, name: 'Quadwing', hue: 215, power: 'Flies on four wings, faster than the wind.' },
  { id: 5, name: 'Starfin', hue: 250, power: 'Swims through the night sky.' },
  { id: 6, name: 'Hexscale', hue: 315, power: 'Its scales are perfect hexagons.' },
  { id: 7, name: 'Ember Drake', hue: 5, power: 'Breathes the hottest fire of all.' },
  { id: 8, name: 'Octofrost', hue: 192, power: 'Freezes rivers with one icy breath.' },
  { id: 9, name: 'Ninefold Gale', hue: 135, power: 'Whips up a storm with a flap of its wings.' },
  { id: 10, name: 'Tenpeak Titan', hue: 220, sat: 14, power: 'Sleeps on the tallest mountain.' },
  { id: 11, name: 'Mirror Drake', hue: 280, power: 'Sees its own face in every puddle.' },
  { id: 12, name: 'Dozen Crown', hue: 48, power: 'Wears a crown of shining jewels.' },
];

export const speciesById = (id: number) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];

// The order eggs are found in.
export const EGG_ORDER = [7, 2, 8, 5, 12, 4, 11, 3, 9, 6, 10, 1];
// Snacks earned before egg number n (counting from 1) turns up. The first
// new egg takes 150 snacks, and each one after takes 25 more than the last:
// 150, 175, 200... so all 12 take 3,025 snacks.
export const FIRST_EGG_GAP = 150;
export const EGG_GAP_GROWTH = 25;
export function snacksForEgg(n: number): number {
  const gaps = Math.max(0, n - 1);
  return gaps * FIRST_EGG_GAP + (EGG_GAP_GROWTH * gaps * (gaps - 1)) / 2;
}

export const STAGE_LEVEL: Record<'hatchling' | 'young' | 'grown', number> = { hatchling: 3, young: 6, grown: 10 };

// The companion eats snacks: 1 for a right answer, 3 for a fast one.
export const SNACKS_RIGHT = 1;
export const SNACKS_FAST = 3;

// Each level needs a few more snacks than the last: 12, 24, 36...
export const LEVEL_STEP = 12;
// Saves from before the longer levels used 10, 20, 30... (see migrateHoard).
export const OLD_LEVEL_STEP = 10;

// The top level. A dragon there keeps eating (snacks still find eggs and fill
// the shop), but its level and meter stay full.
export const MAX_LEVEL = 30;

export function levelFor(snacks: number, step = LEVEL_STEP, max = MAX_LEVEL): { level: number; into: number; needed: number } {
  let level = 1;
  let left = snacks;
  while (level < max && left >= level * step) {
    left -= level * step;
    level++;
  }
  if (level >= max) return { level, into: level * step, needed: level * step };
  return { level, into: left, needed: level * step };
}

// Snacks it takes to reach a level from scratch.
export const snacksForLevel = (level: number, step = LEVEL_STEP) => (step * level * (level - 1)) / 2;

// Ranks a grown dragon earns as it keeps leveling up.
export interface Rank {
  id: 'elder' | 'ancient';
  name: string;
  icon: string;
  level: number;
}

export const RANKS: Rank[] = [
  { id: 'elder', name: 'Elder', icon: '🌟', level: 20 },
  { id: 'ancient', name: 'Ancient', icon: '💎', level: MAX_LEVEL },
];

// The highest rank a level has reached, or undefined below Elder.
export const rankFor = (level: number): Rank | undefined => [...RANKS].reverse().find((r) => level >= r.level);
export const rankIndex = (d: { rank?: Rank }) => (d.rank ? RANKS.indexOf(d.rank) + 1 : 0);
export const nextRank = (level: number): Rank | undefined => RANKS.find((r) => level < r.level);

export function stageForLevel(level: number): Stage {
  if (level >= STAGE_LEVEL.grown) return 'grown';
  if (level >= STAGE_LEVEL.young) return 'young';
  if (level >= STAGE_LEVEL.hatchling) return 'hatchling';
  return 'egg';
}

// Snacks (experience) each dragon has eaten, keyed by species id.
export type Hoard = Record<string, number>;

export interface DragonState {
  species: Species;
  stage: Stage; // 'none' = not found yet
  xp: number;
  level: number;
  into: number; // snacks into the current level
  needed: number; // snacks the current level takes
  rank?: Rank; // Elder and up, for grown dragons
}

export function dragonState(species: Species, hoard: Hoard, found: boolean): DragonState {
  const xp = hoard[String(species.id)] ?? 0;
  const { level, into, needed } = levelFor(xp);
  return { species, stage: found ? stageForLevel(level) : 'none', xp, level, into, needed, rank: found ? rankFor(level) : undefined };
}

export function eggsFound(snacksEarned: number): number {
  let n = 1;
  while (n < EGG_ORDER.length && snacksEarned >= snacksForEgg(n + 1)) n++;
  return n;
}

// Snacks still to earn before the next egg turns up, or null once every egg is
// found. `found` is how many the kid has, which can be more than the pace gives
// for a save moved over from the old, quicker pace.
export function nextEggIn(snacksEarned: number, found = eggsFound(snacksEarned)): number | null {
  const n = Math.max(found, eggsFound(snacksEarned));
  if (n >= EGG_ORDER.length) return null;
  return snacksForEgg(n + 1) - snacksEarned;
}

// Every dragon, in the order eggs are found. Found ones are the first few in
// that order, plus any the kid already has experience on.
export function allDragons(hoard: Hoard, snacksEarned: number): DragonState[] {
  const count = eggsFound(snacksEarned);
  return EGG_ORDER.map((id, i) => dragonState(speciesById(id), hoard, i < count || String(id) in hoard));
}

// The kid's companion: the one they picked if they've found it, else the first one found.
export function companionFor(hoard: Hoard, snacksEarned: number, picked?: number): DragonState {
  const dragons = allDragons(hoard, snacksEarned).filter((d) => d.stage !== 'none');
  return dragons.find((d) => d.species.id === picked) ?? dragons[0];
}

// Give the companion snacks to eat.
export function feed(hoard: Hoard, id: number, snacks: number): Hoard {
  return { ...hoard, [String(id)]: (hoard[String(id)] ?? 0) + snacks };
}

// What changed between two moments: dragons that reached a new stage or rank, and new eggs found.
export function grewBetween(before: DragonState[], after: DragonState[]): DragonState[] {
  return after.filter((a, i) => STAGES.indexOf(a.stage) > STAGES.indexOf(before[i].stage) || rankIndex(a) > rankIndex(before[i]));
}

// Saves from before the longer progression: each dragon keeps exactly the
// level it had, and the same share of the way to the next one, on the new
// scale. Every egg already found stays found (a dragon in the hoard always
// counts as found), even though new eggs now take longer.
export function migrateHoard(hoard: Hoard, snacksEarned: number): Hoard {
  const out: Hoard = {};
  for (const [id, xp] of Object.entries(hoard)) {
    const { level, into, needed } = levelFor(xp, OLD_LEVEL_STEP, Infinity);
    out[id] = snacksForLevel(level) + Math.floor((into / needed) * level * LEVEL_STEP);
  }
  const oldEggs = Math.min(EGG_ORDER.length, 1 + Math.floor(snacksEarned / 150));
  for (const id of EGG_ORDER.slice(0, oldEggs)) if (!(String(id) in out)) out[String(id)] = 0;
  return out;
}

// Facts in one times table: multiplication both ways plus division by it. Used by focus practice.
export function tableFactIds(table: number): string[] {
  return ALL_FACTS.filter((f) => (f.op === 'mul' ? f.a === table || f.b === table : f.a === table)).map((f) => f.id);
}
