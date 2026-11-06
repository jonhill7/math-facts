import { DragonState, MAX_LEVEL, STAGE_LEVEL, STAGES } from './dragons';

// Every dragon has its own power, which works in the games once it hatches.
export type Ability =
  | 'shield' // blocks your first miss in every game
  | 'tailwind' // power meter charges in 2 fast answers instead of 3
  | 'feast' // every right answer is worth 1 extra snack
  | 'lucky' // quest rewards are doubled
  | 'spiky' // league keepers never save your slow shots
  | 'nightVision' // Lantern Hunt: each new hunt starts with one warm or cold clue
  | 'headStart' // each game starts with the power meter nearly full
  | 'blaze' // power moves are even bigger
  | 'frost' // more time in Penalty Saves, and the Tickle Monster is slower
  | 'gust' // the Tickle Monster can't sneak away when you miss
  | 'bossBreaker' // boss rounds forgive one miss and pay double
  | 'secondLook'; // Lantern Hunt: every right answer gives a clue, not just fast ones

// Each power has three levels. Level I works once the dragon hatches and is a
// small boost. Level II comes when the dragon becomes an Elder (dragon level 20)
// and level III when it becomes Ancient (level 30, the top).
export type PowerLevel = 1 | 2 | 3;
export const POWER_LEVEL_AT: Record<PowerLevel, number> = { 1: STAGE_LEVEL.hatchling, 2: 20, 3: MAX_LEVEL };
export const ROMAN: Record<PowerLevel, string> = { 1: 'I', 2: 'II', 3: 'III' };

export interface Power {
  ability: Ability;
  level: PowerLevel;
}

export const ABILITY_INFO: Record<Ability, { name: string; icon: string; levels: [string, string, string] }> = {
  shield: { name: 'Stone Shield', icon: '🛡️', levels: ['Blocks your first miss in every game.', 'Blocks your first 2 misses in every game.', 'Blocks your first 3 misses in every game.'] },
  tailwind: {
    name: 'Tailwind',
    icon: '💨',
    levels: [
      "A slow right answer doesn't empty your power meter.",
      'Your power meter fills in 2 fast answers instead of 3.',
      'Your power meter fills in 2 fast answers, and nothing empties it, not even a miss.',
    ],
  },
  feast: { name: 'Royal Feast', icon: '🍖', levels: ['Every fast answer is worth 1 extra snack.', 'Every right answer is worth 1 extra snack.', 'Every right answer is worth 2 extra snacks.'] },
  lucky: { name: 'Lucky Twins', icon: '🍀', levels: ['Daily quests give half again as many snacks.', 'Daily quests give double snacks.', 'Daily quests give triple snacks.'] },
  spiky: {
    name: 'Spiky Shot',
    icon: '🌵',
    levels: [
      'League keepers save your slow shots half as often.',
      'League keepers can never save your slow shots.',
      'Keepers never save your slow shots, and its spikes block the first counter-attack in every Shoot game.',
    ],
  },
  nightVision: {
    name: 'Night Vision',
    icon: '🌟',
    levels: [
      'In Lantern Hunt, the first hunt of every game starts with a free clue.',
      'In Lantern Hunt, every new hunt starts with a free clue.',
      'In Lantern Hunt, every new hunt starts with 2 free clues.',
    ],
  },
  headStart: {
    name: 'Head Start',
    icon: '🚀',
    levels: [
      'Every game starts with your power meter partly full.',
      'Every game starts with your power meter almost full.',
      'Every game starts with your power meter almost full, and it refills partway after each power move.',
    ],
  },
  blaze: {
    name: 'Blaze',
    icon: '🔥',
    levels: [
      'Power moves are bigger: 3-goal shots and triple saves.',
      'Power moves are bigger: 3-goal shots, triple saves, and a huge super lantern.',
      'Power moves are huge: 4-goal shots, 4-save saves, and a huge super lantern.',
    ],
  },
  frost: {
    name: 'Frost Breath',
    icon: '❄️',
    levels: [
      '1 extra second in Penalty Saves, and the Tickle Monster needs 4 steps to reach you.',
      '2 extra seconds in Penalty Saves, and the Tickle Monster needs 4 steps to reach you.',
      '3 extra seconds in Penalty Saves, and the Tickle Monster needs 5 steps to reach you.',
    ],
  },
  gust: {
    name: 'Gust',
    icon: '🌪️',
    levels: [
      "In Lantern Hunt, the Tickle Monster can't sneak away on your first miss each hunt.",
      "In Lantern Hunt, the Tickle Monster can't sneak away when you miss.",
      "The Tickle Monster can't sneak away when you miss, and the Gust blows it back on your first miss each hunt.",
    ],
  },
  bossBreaker: {
    name: 'Boss Breaker',
    icon: '🏔️',
    levels: [
      'Boss rounds forgive one miss and give half again as many snacks.',
      'Boss rounds forgive one miss and give double snacks.',
      'Boss rounds forgive 2 misses and give triple snacks.',
    ],
  },
  secondLook: {
    name: 'Second Look',
    icon: '👀',
    levels: [
      'In Lantern Hunt, a right answer that just misses the speed goal still gives a clue.',
      'In Lantern Hunt, every right answer gives a clue, not just fast ones.',
      'Every right answer gives a clue, and every new hunt starts with a free clue.',
    ],
  },
};

// What a power does at a level, for showing to the kid.
export const powerText = (p: Power) => ABILITY_INFO[p.ability].levels[p.level - 1];
export const powerName = (p: Power) => `${ABILITY_INFO[p.ability].name} ${ROMAN[p.level]}`;

// The power level a dragon's level gives, or 0 before it hatches.
export function powerLevelFor(level: number): PowerLevel | 0 {
  if (level >= POWER_LEVEL_AT[3]) return 3;
  if (level >= POWER_LEVEL_AT[2]) return 2;
  if (level >= POWER_LEVEL_AT[1]) return 1;
  return 0;
}

// The dragon level the next power level comes at, or undefined at level III.
export function nextPowerAt(level: number): { level: PowerLevel; at: number } | undefined {
  const now = powerLevelFor(level);
  return now >= 3 ? undefined : { level: (now + 1) as PowerLevel, at: POWER_LEVEL_AT[(now + 1) as PowerLevel] };
}

// Species id -> its power.
const BY_SPECIES: Record<number, Ability> = {
  1: 'shield', // Pebble Wyrm
  2: 'lucky', // Twin-Tail
  3: 'spiky', // Thornback
  4: 'tailwind', // Quadwing
  5: 'nightVision', // Starfin
  6: 'headStart', // Hexscale
  7: 'blaze', // Ember Drake
  8: 'frost', // Octofrost
  9: 'gust', // Ninefold Gale
  10: 'bossBreaker', // Tenpeak Titan
  11: 'secondLook', // Mirror Drake
  12: 'feast', // Dozen Crown
};

export function abilityOf(speciesId: number): Ability {
  return BY_SPECIES[speciesId] ?? 'shield';
}

// A dragon's power works once it has hatched.
export function activeAbility(d: DragonState | undefined): Ability | undefined {
  if (!d || STAGES.indexOf(d.stage) < STAGES.indexOf('hatchling')) return undefined;
  return abilityOf(d.species.id);
}

// A hatched dragon's power and how strong it is.
export function activePower(d: DragonState | undefined): Power | undefined {
  const ability = activeAbility(d);
  const level = d ? powerLevelFor(d.level) : 0;
  return ability && level ? { ability, level } : undefined;
}

const lvl = (p: Power | undefined, a: Ability) => (p?.ability === a ? p.level : 0);

export const chargeNeeded = (p?: Power) => (lvl(p, 'tailwind') >= 2 ? 2 : 3);
// Head Start: I starts the meter 1 charged, II and III one short of full.
export const startCharge = (p?: Power) => (lvl(p, 'headStart') >= 2 ? chargeNeeded(p) - 1 : lvl(p, 'headStart'));
// Head Start III: the meter refills partway after each power move.
export const chargeAfterPower = (p?: Power) => (lvl(p, 'headStart') >= 3 ? 1 : 0);
// Tailwind I: a slow right answer keeps the meter. Tailwind III: so does a miss.
export const keepsCharge = (p: Power | undefined, correct: boolean) => (lvl(p, 'tailwind') === 1 ? correct : lvl(p, 'tailwind') === 3);
// Royal Feast: I is 1 extra snack for fast answers, II 1 for any right answer, III 2.
export const snackBonus = (p: Power | undefined, fast: boolean) => [0, fast ? 1 : 0, 1, 2][lvl(p, 'feast')];
export const powerSize = (p?: Power) => (lvl(p, 'blaze') >= 3 ? 4 : lvl(p, 'blaze') ? 3 : 2); // goals or saves a power move is worth
export const lanternReach = (p?: Power) => (lvl(p, 'blaze') >= 2 ? 2 : 1); // rings a super lantern searches
export const questMultiplier = (p?: Power) => [1, 1.5, 2, 3][lvl(p, 'lucky')];
export const bossForgives = (p?: Power) => (lvl(p, 'bossBreaker') >= 3 ? 2 : lvl(p, 'bossBreaker') ? 1 : 0);
export const bossMultiplier = (p?: Power) => [1, 1.5, 2, 3][lvl(p, 'bossBreaker')];
export const extraClockMs = (p?: Power) => lvl(p, 'frost') * 1000;
export const ticklesToAttack = (p?: Power) => (lvl(p, 'frost') >= 3 ? 5 : lvl(p, 'frost') ? 4 : 3);
// Spiky Shot: how often league keepers still save slow shots (1 = as usual).
export const slowSaveFactor = (p?: Power) => [1, 0.5, 0, 0][lvl(p, 'spiky')];
// Misses a game's shield blocks: the Stone Shield, or Spiky Shot III's spikes in Shoot games.
export const shieldsFor = (p: Power | undefined, shooting: boolean) => lvl(p, 'shield') + (shooting && lvl(p, 'spiky') >= 3 ? 1 : 0);
// Lantern Hunt: free clues at the start of a hunt (hunt 0 is the first of the game).
export const freeClues = (p: Power | undefined, hunt: number) =>
  [0, hunt === 0 ? 1 : 0, 1, 2][lvl(p, 'nightVision')] + (lvl(p, 'secondLook') >= 3 ? 1 : 0);
// Lantern Hunt: whether a right but slow answer still lights a clue.
export const slowClue = (p: Power | undefined, ms: number, goalMs: number) => lvl(p, 'secondLook') >= 2 || (lvl(p, 'secondLook') === 1 && ms <= goalMs * 1.5);
export const anySlowClue = (p?: Power) => lvl(p, 'secondLook') >= 2;
// Gust: misses each hunt the monster can't sneak away on, and misses it's blown back on.
export const sneakBlocks = (p?: Power) => [0, 1, Infinity, Infinity][lvl(p, 'gust')];
export const gustBlocks = (p?: Power) => (lvl(p, 'gust') >= 3 ? 1 : 0);
