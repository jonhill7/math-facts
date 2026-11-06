import { DragonState, STAGES } from './dragons';

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

export const ABILITY_INFO: Record<Ability, { name: string; icon: string; text: string }> = {
  shield: { name: 'Stone Shield', icon: '🛡️', text: 'Blocks your first miss in every game.' },
  tailwind: { name: 'Tailwind', icon: '💨', text: 'Your power meter fills in 2 fast answers instead of 3.' },
  feast: { name: 'Royal Feast', icon: '🍖', text: 'Every right answer is worth 1 extra snack.' },
  lucky: { name: 'Lucky Twins', icon: '🍀', text: 'Daily quests give double snacks.' },
  spiky: { name: 'Spiky Shot', icon: '🌵', text: 'League keepers can never save your slow shots.' },
  nightVision: { name: 'Night Vision', icon: '🌟', text: 'In Lantern Hunt, every new hunt starts with a free warm or cold clue.' },
  headStart: { name: 'Head Start', icon: '🚀', text: 'Every game starts with your power meter almost full.' },
  blaze: { name: 'Blaze', icon: '🔥', text: 'Power moves are bigger: 3-goal shots, triple saves, and a huge super lantern.' },
  frost: { name: 'Frost Breath', icon: '❄️', text: '2 extra seconds in Penalty Saves, and the Tickle Monster needs 4 steps to reach you.' },
  gust: { name: 'Gust', icon: '🌪️', text: "In Lantern Hunt, the Tickle Monster can't sneak away when you miss." },
  bossBreaker: { name: 'Boss Breaker', icon: '🏔️', text: 'Boss rounds forgive one miss and give double snacks.' },
  secondLook: { name: 'Second Look', icon: '👀', text: 'In Lantern Hunt, every right answer gives a clue, not just fast ones.' },
};

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

export const chargeNeeded = (a: Ability | undefined) => (a === 'tailwind' ? 2 : 3);
export const startCharge = (a: Ability | undefined) => (a === 'headStart' ? chargeNeeded(a) - 1 : 0);
export const snackBonus = (a: Ability | undefined) => (a === 'feast' ? 1 : 0);
export const powerSize = (a: Ability | undefined) => (a === 'blaze' ? 3 : 2); // goals or saves a power move is worth
export const questMultiplier = (a: Ability | undefined) => (a === 'lucky' ? 2 : 1);
export const bossForgives = (a: Ability | undefined) => (a === 'bossBreaker' ? 1 : 0);
export const bossMultiplier = (a: Ability | undefined) => (a === 'bossBreaker' ? 2 : 1);
export const extraClockMs = (a: Ability | undefined) => (a === 'frost' ? 2000 : 0);
