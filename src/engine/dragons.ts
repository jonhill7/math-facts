import { ALL_FACTS } from './facts';

// Dragons grow from practice. The kid's companion (an egg or a dragon) eats a
// snack for every right answer, and those snacks are its experience. More
// experience means a higher level, and levels hatch and grow it:
//   egg       -> levels 1-2
//   hatchling -> levels 3-5
//   young     -> levels 6-9
//   grown     -> level 10 and up
// The kid starts with one egg and finds another every so often as they practice.

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
export const SNACKS_PER_EGG = 150; // a new egg turns up every this many snacks earned

export const STAGE_LEVEL: Record<'hatchling' | 'young' | 'grown', number> = { hatchling: 3, young: 6, grown: 10 };

// The companion eats snacks: 1 for a right answer, 3 for a fast one.
export const SNACKS_RIGHT = 1;
export const SNACKS_FAST = 3;

// Each level needs a few more snacks than the last: 10, 20, 30...
export function levelFor(snacks: number): { level: number; into: number; needed: number } {
  let level = 1;
  let left = snacks;
  while (left >= level * 10) {
    left -= level * 10;
    level++;
  }
  return { level, into: left, needed: level * 10 };
}

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
}

export function dragonState(species: Species, hoard: Hoard, found: boolean): DragonState {
  const xp = hoard[String(species.id)] ?? 0;
  const { level, into, needed } = levelFor(xp);
  return { species, stage: found ? stageForLevel(level) : 'none', xp, level, into, needed };
}

export const eggsFound = (snacksEarned: number) => Math.min(EGG_ORDER.length, 1 + Math.floor(snacksEarned / SNACKS_PER_EGG));

// Snacks still to earn before the next egg turns up, or null once every egg is found.
export function nextEggIn(snacksEarned: number): number | null {
  if (eggsFound(snacksEarned) >= EGG_ORDER.length) return null;
  return SNACKS_PER_EGG - (snacksEarned % SNACKS_PER_EGG);
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

// What changed between two moments: dragons that reached a new stage, and new eggs found.
export function grewBetween(before: DragonState[], after: DragonState[]): DragonState[] {
  return after.filter((a, i) => STAGES.indexOf(a.stage) > STAGES.indexOf(before[i].stage));
}

// Facts in one times table: multiplication both ways plus division by it. Used by focus practice.
export function tableFactIds(table: number): string[] {
  return ALL_FACTS.filter((f) => (f.op === 'mul' ? f.a === table || f.b === table : f.a === table)).map((f) => f.id);
}
