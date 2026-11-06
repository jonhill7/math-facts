// The soccer league: twelve rival teams in a ladder, weakest first.
// Beat a team to move up. Beat the top team to win the trophy and start a new season.

export const LEAGUE = [
  'Pickle Pirates',
  'Turbo Turtles',
  'Galaxy Goats',
  'Midnight Moose',
  'Blizzard Badgers',
  'Rocket Raccoons',
  'Volcano Vultures',
  'Thunder Toads',
  'Comet Cobras',
  'Hurricane Hippos',
  'Lightning Llamas',
  'Supernova Sharks',
];

// How far up the ladder a level is, from 0 (the first team) to 1 (the top team).
const climb = (level: number) => Math.min(level, LEAGUE.length - 1) / (LEAGUE.length - 1);

export interface League {
  level: number; // index into LEAGUE of the team you play next
  trophies: number;
}

export const emptyLeague = (): League => ({ level: 0, trophies: 0 });

export const rivalFor = (league: League) => LEAGUE[Math.min(league.level, LEAGUE.length - 1)];

export function afterMatch(league: League, won: boolean): League {
  if (!won) return league;
  if (league.level >= LEAGUE.length - 1) return { level: 0, trophies: league.trophies + 1 };
  return { ...league, level: league.level + 1 };
}

// Better teams have better keepers: a right but slow shot may be saved.
// Fast answers always score.
// The top team saves 42% of slow shots.
export const slowSaveChance = (level: number) => Math.round(climb(level) * 42) / 100;

// Better teams shoot sooner, so the keeper has less time to answer. The clock
// starts from the fact's speed goal (see speed.ts), so hard facts get longer
// and there's always time left after the goal for a plain (not diving) save.
// The top team leaves 0.6 seconds after the goal, the first team 2 seconds.
export const shotClockMs = (goalMs: number, level: number) => goalMs + 2000 - Math.round(climb(level) * 1400);
