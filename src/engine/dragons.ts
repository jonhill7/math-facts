import { ALL_FACTS, MAX_FACTOR } from './facts';
import { MASTERED_BOX, Progress } from './scheduler';

// Every times table has its own dragon. A dragon's egg appears once the kid
// starts practicing that table, and it grows as the table's facts are learned:
//   egg       -> some facts of the table tried
//   hatchling -> half the table's facts known well (box 3 or higher)
//   young     -> every fact of the table known well
//   grown     -> every fact of the table mastered (box 5, checked weeks apart)

export type Stage = 'none' | 'egg' | 'hatchling' | 'young' | 'grown';
export const STAGES: Stage[] = ['none', 'egg', 'hatchling', 'young', 'grown'];

export interface Species {
  table: number;
  name: string;
  hue: number; // color tint for the dragon picture, in degrees
  power: string;
}

export const SPECIES: Species[] = [
  { table: 1, name: 'Pebble Wyrm', hue: 30, power: 'Never changes, never forgets.' },
  { table: 2, name: 'Twin-Tail', hue: 160, power: 'Doubles everything it sees.' },
  { table: 3, name: 'Thornback', hue: 90, power: 'Grows spikes in threes.' },
  { table: 4, name: 'Quadwing', hue: 200, power: 'Flies on four wings, double-double fast.' },
  { table: 5, name: 'Starfin', hue: 250, power: 'Counts by fives on its fingers and fins.' },
  { table: 6, name: 'Hexscale', hue: 300, power: 'Its scales are perfect hexagons.' },
  { table: 7, name: 'Ember Drake', hue: 330, power: 'Breathes the hottest fire of all.' },
  { table: 8, name: 'Octofrost', hue: 180, power: 'Freezes rivers with eight icy breaths.' },
  { table: 9, name: 'Ninefold Gale', hue: 120, power: 'Knows the times-ten-minus-one trick.' },
  { table: 10, name: 'Tenpeak Titan', hue: 0, power: 'Sleeps on the tenth mountain.' },
  { table: 11, name: 'Mirror Drake', hue: 270, power: 'Sees its own digits twice.' },
  { table: 12, name: 'Dozen Crown', hue: 45, power: 'Wears a crown with twelve jewels.' },
];

export function tableFactIds(table: number): string[] {
  return ALL_FACTS.filter((f) => (f.op === 'mul' ? f.a === table || f.b === table : f.a === table)).map((f) => f.id);
}

const TABLE_FACTS = new Map(Array.from({ length: MAX_FACTOR }, (_, i) => [i + 1, tableFactIds(i + 1)]));

export interface DragonState {
  species: Species;
  stage: Stage;
  known: number; // facts at box 3 or higher
  mastered: number;
  total: number;
}

export function dragonState(progress: Progress, species: Species): DragonState {
  const ids = TABLE_FACTS.get(species.table) ?? [];
  let tried = 0;
  let known = 0;
  let mastered = 0;
  for (const id of ids) {
    const s = progress[id];
    if (!s) continue;
    tried++;
    if (s.box >= 3) known++;
    if (s.box >= MASTERED_BOX) mastered++;
  }
  const total = ids.length;
  let stage: Stage = 'none';
  if (mastered === total) stage = 'grown';
  else if (known === total) stage = 'young';
  else if (known * 2 >= total) stage = 'hatchling';
  else if (tried > 0) stage = 'egg';
  return { species, stage, known, mastered, total };
}

export function allDragons(progress: Progress): DragonState[] {
  return SPECIES.map((s) => dragonState(progress, s));
}

// Dragons that reached a new stage between two snapshots of progress.
export function grewBetween(before: Progress, after: Progress): DragonState[] {
  return SPECIES.map((s) => [dragonState(before, s), dragonState(after, s)] as const)
    .filter(([b, a]) => STAGES.indexOf(a.stage) > STAGES.indexOf(b.stage))
    .map(([, a]) => a);
}

// The companion dragon eats snacks: 1 for a right answer, 3 for a fast one.
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
