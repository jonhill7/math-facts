import { DragonState, STAGES } from './dragons';

// Dragons that have hatched lend the kid a power in every game.
//   Shield: blocks the first miss of each game, so the rivals don't score from it.
//   Spark:  the power meter charges in 2 fast answers instead of 3.
//   Feast:  every right answer is worth 1 extra snack.
export type Ability = 'shield' | 'spark' | 'feast';

export const ABILITY_INFO: Record<Ability, { name: string; icon: string; text: string }> = {
  shield: { name: 'Shield', icon: '🛡️', text: 'Blocks your first miss in every game.' },
  spark: { name: 'Spark', icon: '⚡', text: 'Charges your power meter in 2 fast answers instead of 3.' },
  feast: { name: 'Feast', icon: '🍖', text: 'Every right answer is worth 1 extra snack.' },
};

const BY_TABLE: Ability[] = ['shield', 'spark', 'feast'];

export function abilityOf(table: number): Ability {
  return BY_TABLE[(table - 1) % 3];
}

// A dragon's power works once it has hatched.
export function activeAbility(d: DragonState | undefined): Ability | undefined {
  if (!d || STAGES.indexOf(d.stage) < STAGES.indexOf('hatchling')) return undefined;
  return abilityOf(d.species.table);
}

export const chargeNeeded = (a: Ability | undefined) => (a === 'spark' ? 2 : 3);
export const snackBonus = (a: Ability | undefined) => (a === 'feast' ? 1 : 0);
