import { factById, Fact } from './facts';
import { Progress, troubleFacts } from './scheduler';

// Every 5th game ends with a boss round made of the kid's trouble facts.
export const BOSS_EVERY = 5;
export const BOSS_SIZE = 5;
const BOSS_MIN = 3; // too few trouble facts and there's no boss this time

export const isBossGame = (sessionsPlayed: number) => (sessionsPlayed + 1) % BOSS_EVERY === 0;

export function bossFor(progress: Progress, lantern: boolean): { name: string; icon: string; facts: Fact[] } | undefined {
  const facts = troubleFacts(progress, BOSS_SIZE).map((t) => factById(t.id));
  if (facts.length < BOSS_MIN) return undefined;
  return lantern ? { name: 'the Tickle Monster King', icon: '👑', facts } : { name: 'Captain Cannonball', icon: '💥', facts };
}

// Facts known well (box 3 or higher): what unlocks places on the world tour.
export const knownCount = (progress: Progress) => Object.values(progress).filter((s) => s.box >= 3).length;
