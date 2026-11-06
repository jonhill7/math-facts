// Badges: a permanent list of accomplishments. A badge is earned the first
// time its goal is reached and is kept forever, even if the thing it measures
// later goes down (a streak that ends, or a speed title that slips).

import { allDragons, Hoard, rankIndex, RANKS } from './dragons';
import { knownCount } from './boss';
import { PLACES, unlocked } from './places';
import { ALL_FACTS } from './facts';
import { League } from './league';
import { RaceState, RIVALS, SPEED_TITLES, speedTitle } from './race';
import { MASTERED_BOX, Progress } from './scheduler';
import { Streak } from './streak';

// The parts of a save that badges look at.
export interface BadgeInput {
  progress: Progress;
  stats: {
    sessions: number;
    goals: number;
    topCorners: number;
    saves: number;
    monstersFound: number;
    tickles: number;
    snacks: number;
    matchesWon: number;
    powers: number;
    bossesBeaten: number;
    bestStreak: number;
    perfectGames: number;
    bestFastGame: number;
    ghostWins: number;
  };
  streak: Streak;
  league: League;
  race: RaceState;
  hoard: Hoard;
  settings: { fastMs: number };
}

// When each badge was earned (ms since 1970), keyed by badge id.
export type Earned = Record<string, number>;

export type Tier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Badge {
  id: string;
  group: string;
  name: string;
  icon: string;
  text: string; // how to earn it
  tier: Tier;
  goal: number;
  unit?: string; // shown with progress, e.g. "12 of 50 goals"
}

export interface BadgeGroup {
  id: string;
  section: string; // where it shows in the badge case
  name: string;
  icon: string;
  value: (d: BadgeInput) => number; // how far along the kid is right now
}

const mastered = (p: Progress) => ALL_FACTS.filter((f) => (p[f.id]?.box ?? 0) >= MASTERED_BOX).length;

// A times table is mastered when every fact in it is: both ways round, and division by it.
const tablesMastered = (p: Progress) =>
  Array.from({ length: 12 }, (_, i) => i + 1).filter((t) =>
    ALL_FACTS.filter((f) => (f.op === 'mul' ? f.a === t || f.b === t : f.a === t)).every((f) => (p[f.id]?.box ?? 0) >= MASTERED_BOX),
  ).length;

const speedLevel = (d: BadgeInput) => {
  const title = speedTitle(d.progress, ALL_FACTS);
  return title ? SPEED_TITLES.findIndex((t) => t.name === title.name) : 0;
};

const dragons = (d: BadgeInput) => allDragons(d.hoard, d.stats.snacks);
const hatched = (d: BadgeInput) => dragons(d).filter((x) => x.stage !== 'none' && x.stage !== 'egg').length;
const grown = (d: BadgeInput) => dragons(d).filter((x) => x.stage === 'grown').length;
const eggs = (d: BadgeInput) => dragons(d).filter((x) => x.stage !== 'none').length;
const topRank = (d: BadgeInput) => Math.max(0, ...dragons(d).map(rankIndex));
const elders = (d: BadgeInput) => dragons(d).filter((x) => rankIndex(x) > 0).length;
const placesOpen = (d: BadgeInput) => {
  const known = knownCount(d.progress);
  const m = mastered(d.progress);
  return PLACES.filter((p) => unlocked(p, known, m)).length;
};
const topLevel = (d: BadgeInput) => Math.max(1, ...dragons(d).filter((x) => x.stage !== 'none').map((x) => x.level));

export const BADGE_GROUPS: BadgeGroup[] = [
  { id: 'speed', section: 'Speed', name: 'Speed', icon: '⚡', value: speedLevel },
  { id: 'quick', section: 'Speed', name: 'Quick draw', icon: '💨', value: (d) => d.stats.bestFastGame },
  { id: 'streak', section: 'Streaks and practice', name: 'Streaks', icon: '🔥', value: (d) => Math.max(d.stats.bestStreak, d.streak.count) },
  { id: 'games', section: 'Streaks and practice', name: 'Practice', icon: '📅', value: (d) => d.stats.sessions },
  { id: 'facts', section: 'Learning', name: 'Facts mastered', icon: '🧠', value: (d) => mastered(d.progress) },
  { id: 'tables', section: 'Learning', name: 'Times tables', icon: '✖️', value: (d) => tablesMastered(d.progress) },
  { id: 'perfect', section: 'Learning', name: 'Perfect games', icon: '💯', value: (d) => d.stats.perfectGames },
  { id: 'goals', section: 'Penalty Kicks', name: 'Penalty Kicks: goals', icon: '⚽', value: (d) => d.stats.goals },
  { id: 'corners', section: 'Penalty Kicks', name: 'Penalty Kicks: top corners', icon: '🎯', value: (d) => d.stats.topCorners },
  { id: 'saves', section: 'Penalty Kicks', name: 'Penalty Kicks: saves', icon: '🧤', value: (d) => d.stats.saves },
  { id: 'wins', section: 'Penalty Kicks', name: 'Penalty Kicks: matches won', icon: '🏟️', value: (d) => d.stats.matchesWon },
  { id: 'trophies', section: 'Penalty Kicks', name: 'League trophies', icon: '🏆', value: (d) => d.league.trophies },
  { id: 'monsters', section: 'Lantern Hunt', name: 'Lantern Hunt: monsters found', icon: '👾', value: (d) => d.stats.monstersFound },
  { id: 'tickles', section: 'Lantern Hunt', name: 'Lantern Hunt: tickle attacks', icon: '🤗', value: (d) => d.stats.tickles },
  { id: 'races', section: 'Sky Race', name: 'Sky Race: races', icon: '🏁', value: (d) => d.race.races },
  { id: 'rivals', section: 'Sky Race', name: 'Sky Race: rivals beaten', icon: '🐉', value: (d) => d.race.rivalsBeaten },
  { id: 'ghosts', section: 'Sky Race', name: 'Sky Race: ghosts beaten', icon: '👻', value: (d) => d.stats.ghostWins },
  { id: 'golds', section: 'Sky Race', name: 'Sky Race: solo golds', icon: '🥇', value: (d) => d.race.golds },
  { id: 'bosses', section: 'Bosses and powers', name: 'Bosses beaten', icon: '👑', value: (d) => d.stats.bossesBeaten },
  { id: 'powers', section: 'Bosses and powers', name: 'Power moves', icon: '⚡', value: (d) => d.stats.powers },
  { id: 'eggs', section: 'Dragons', name: 'Eggs found', icon: '🥚', value: eggs },
  { id: 'hatched', section: 'Dragons', name: 'Dragons hatched', icon: '🐣', value: hatched },
  { id: 'grown', section: 'Dragons', name: 'Dragons fully grown', icon: '🐲', value: grown },
  { id: 'level', section: 'Dragons', name: 'Dragon level', icon: '⭐', value: topLevel },
  { id: 'rank', section: 'Dragons', name: 'Dragon ranks', icon: '🌟', value: topRank },
  { id: 'elders', section: 'Dragons', name: 'Elder dragons', icon: '🌟', value: elders },
  { id: 'places', section: 'Learning', name: 'World tour', icon: '🌍', value: placesOpen },
];

// Sections of the badge case, in order, with their icons.
export const BADGE_SECTIONS: { name: string; icon: string }[] = [
  { name: 'Speed', icon: '⚡' },
  { name: 'Streaks and practice', icon: '🔥' },
  { name: 'Learning', icon: '🧠' },
  { name: 'Penalty Kicks', icon: '⚽' },
  { name: 'Lantern Hunt', icon: '🔦' },
  { name: 'Sky Race', icon: '🏁' },
  { name: 'Bosses and powers', icon: '👑' },
  { name: 'Dragons', icon: '🐉' },
];

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'diamond'];

// A ladder of badges in one group, easiest first. Tiers spread from bronze to diamond.
function ladder(group: string, unit: string, steps: [goal: number, name: string, text: string][], icon?: string): Badge[] {
  const g = BADGE_GROUPS.find((x) => x.id === group)!;
  return steps.map(([goal, name, text], i) => ({
    id: `${group}-${goal}`,
    group,
    name,
    icon: icon ?? g.icon,
    text,
    goal,
    unit,
    tier: TIERS[steps.length === 1 ? 0 : Math.round((i / (steps.length - 1)) * (TIERS.length - 1))],
  }));
}

const n = (x: number) => x.toLocaleString('en-US');
const counts = (group: string, unit: string, names: [number, string][], text: (goal: string) => string) =>
  ladder(group, unit, names.map(([goal, name]) => [goal, name, text(n(goal))]));

export const BADGES: Badge[] = [
  // One badge for every speed title above the first, using the title's own icon.
  ...SPEED_TITLES.slice(1).map((t, i, all): Badge => ({
    id: `speed-${i + 1}`,
    group: 'speed',
    name: t.name,
    icon: t.icon,
    text: `Earn the ${t.name} speed title.`,
    goal: i + 1,
    tier: TIERS[Math.round((i / (all.length - 1)) * (TIERS.length - 1))],
  })),
  ...counts('quick', 'super fast', [[10, 'Quick Draw'], [20, 'Lightning Fingers'], [30, 'Thunderbolt']], (g) => `Answer ${g} facts super fast in one game.`),
  ...ladder('streak', 'days', [
    [3, 'Spark', 'Practice 3 days in a row.'],
    [7, 'Week Warrior', 'Practice 7 days in a row.'],
    [14, 'Two-Week Torch', 'Practice 14 days in a row.'],
    [30, 'Month of Fire', 'Practice 30 days in a row.'],
    [60, 'Blazing', 'Practice 60 days in a row.'],
    [100, 'Hundred-Day Flame', 'Practice 100 days in a row.'],
    [365, 'Eternal Flame', 'Practice every day for a whole year.'],
  ]),
  ...ladder('games', 'games', [
    [1, 'First Flight', 'Play your first game.'],
    [10, 'Getting Going', 'Play 10 games.'],
    [25, 'Regular', 'Play 25 games.'],
    [50, 'Dedicated', 'Play 50 games.'],
    [100, 'Century', 'Play 100 games.'],
    [250, 'Unstoppable', 'Play 250 games.'],
    [500, 'Legend', 'Play 500 games.'],
  ]),
  ...counts('facts', 'facts', [[1, 'First Fact'], [25, 'Fact Finder'], [50, 'Fact Collector'], [100, 'Fact Hoarder'], [200, 'Fact Wizard']], (g) => `Master ${g} facts.`),
  ...ladder('facts', 'facts', [[ALL_FACTS.length, 'Math Master', `Master all ${ALL_FACTS.length} facts.`]]).map((b) => ({ ...b, icon: '🎓', tier: 'diamond' as Tier })),
  ...ladder('tables', 'tables', [
    [1, 'Table Tamer', 'Master every fact in one times table.'],
    [3, 'Triple Table', 'Master 3 times tables.'],
    [6, 'Half Way There', 'Master 6 times tables.'],
    [12, 'Times Table Royalty', 'Master all 12 times tables.'],
  ]),
  ...counts('perfect', 'perfect games', [[1, 'Flawless'], [10, 'Perfectionist'], [50, 'Never Misses']], (g) => (g === '1' ? 'Get every answer right in a game.' : `Get every answer right in ${g} games.`)),
  ...counts('goals', 'goals', [[10, 'First Goals'], [50, 'Striker'], [100, 'Hat-Trick Hero'], [250, 'Goal Machine'], [500, 'Golden Boot'], [1000, 'Thousand-Goal Legend']], (g) => `Score ${g} goals.`),
  ...counts('corners', 'top corners', [[10, 'Top Bins'], [50, 'Sharpshooter'], [200, 'Sniper']], (g) => `Hit ${g} top-corner shots.`),
  ...counts('saves', 'saves', [[10, 'Safe Hands'], [50, 'Brick Wall'], [100, 'Super Keeper'], [250, 'Golden Glove'], [500, 'Fortress'], [1000, 'Thousand-Save Wall']], (g) => `Make ${g} saves.`),
  ...counts('wins', 'wins', [[1, 'First Win'], [10, 'Winning Streak'], [50, 'Champion Team']], (g) => (g === '1' ? 'Win a penalty match.' : `Win ${g} penalty matches.`)),
  ...counts('trophies', 'trophies', [[1, 'League Champion'], [3, 'Triple Crown'], [10, 'Dynasty'], [25, 'Hall of Fame']], (g) => (g === '1' ? 'Win the league.' : `Win the league ${g} times.`)),
  ...counts('monsters', 'monsters', [[1, 'Peekaboo'], [10, 'Monster Spotter'], [50, 'Monster Tracker'], [100, 'Monster Hunter'], [250, 'Fearless']], (g) => (g === '1' ? 'Find the Tickle Monster.' : `Find the Tickle Monster ${g} times.`)),
  ...counts('tickles', 'tickle attacks', [[1, 'Ticklish'], [25, 'Giggle Proof']], (g) => (g === '1' ? 'Survive a tickle attack.' : `Survive ${g} tickle attacks.`)),
  ...counts('races', 'races', [[1, 'Takeoff'], [10, 'Frequent Flier'], [50, 'Sky Veteran'], [100, 'Cloud Commander']], (g) => (g === '1' ? 'Fly your first Sky Race.' : `Fly ${g} Sky Races.`)),
  // One badge for each rival on the ladder.
  ...RIVALS.map((r, i): Badge => ({
    id: `rivals-${i + 1}`,
    group: 'rivals',
    name: i === RIVALS.length - 1 ? 'Sky Champion' : `Beat ${r.name.split(' ')[0]}`,
    icon: i === RIVALS.length - 1 ? '🏆' : '🐉',
    text: `Beat ${r.name} in a Sky Race.`,
    goal: i + 1,
    unit: 'rivals',
    tier: TIERS[Math.round((i / (RIVALS.length - 1)) * (TIERS.length - 1))],
  })),
  ...counts('ghosts', 'ghosts', [[1, 'Ghost Buster'], [10, 'Beat Myself'], [50, 'Always Improving']], (g) => (g === '1' ? 'Beat your ghost in a Sky Race.' : `Beat your ghost ${g} times.`)),
  ...counts('golds', 'golds', [[1, 'Gold Wings'], [10, 'Golden Flier'], [50, 'Solid Gold']], (g) => (g === '1' ? 'Win a solo gold medal.' : `Win ${g} solo gold medals.`)),
  ...counts('bosses', 'bosses', [[1, 'Boss Beater'], [10, 'Boss Breaker'], [25, 'Boss of Bosses']], (g) => (g === '1' ? 'Beat a boss.' : `Beat ${g} bosses.`)),
  ...counts('powers', 'power moves', [[10, 'Powered Up'], [100, 'Supercharged'], [500, 'Unlimited Power']], (g) => `Use ${g} power moves.`),
  ...counts('eggs', 'eggs', [[2, 'Egg Finder'], [6, 'Nest Builder'], [12, 'Full Nest']], (g) => (g === '12' ? 'Find every dragon egg.' : `Find ${g} dragon eggs.`)),
  ...counts('hatched', 'dragons', [[1, 'It Hatched!'], [4, 'Dragon Family'], [12, 'Dragon Keeper']], (g) => (g === '1' ? 'Hatch a dragon.' : `Hatch ${g} dragons.`)),
  ...counts('grown', 'dragons', [[1, 'All Grown Up'], [3, 'Dragon Rider'], [6, 'Dragon Tamer'], [12, 'Dragon Lord']], (g) => (g === '1' ? 'Grow a dragon all the way up.' : `Grow ${g} dragons all the way up.`)),
  ...counts('level', 'level', [[10, 'Level 10'], [20, 'Level 20'], [30, 'Level 30'], [40, 'Level 40'], [50, 'Level 50']], (g) => `Get a dragon to level ${g}.`),
  // One badge for each rank a grown dragon can reach, using the rank's own icon.
  ...RANKS.map((r, i): Badge => ({
    id: `rank-${i + 1}`,
    group: 'rank',
    name: `${r.name} Dragon`,
    icon: r.icon,
    text: `Get a dragon to level ${r.level} to make it ${r.name === 'Elder' ? 'an' : 'a'} ${r.name} dragon.`,
    goal: i + 1,
    tier: (['silver', 'gold', 'diamond'] as Tier[])[i],
  })),
  ...counts('elders', 'dragons', [[3, 'Council of Elders'], [12, 'Elder Hatchery']], (g) => `Make ${g} dragons Elders (level 20).`),
  ...counts('places', 'places', [[4, 'Explorer'], [8, 'Globetrotter'], [PLACES.length, 'Over the Moon']], (g) =>
    g === String(PLACES.length) ? 'Unlock every stop on the world tour, all the way to the Moon.' : `Unlock ${g} places on the world tour.`,
  ),
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

// How far along a badge is, for the progress bar on locked badges.
export function badgeProgress(badge: Badge, d: BadgeInput): number {
  const group = BADGE_GROUPS.find((g) => g.id === badge.group)!;
  return Math.min(badge.goal, group.value(d));
}

// Add any badges reached right now to the ones already earned. Earned badges
// are never taken away. Returns the badges that are new this time.
export function checkBadges(earned: Earned, d: BadgeInput, now: number): { earned: Earned; fresh: Badge[] } {
  const values = new Map(BADGE_GROUPS.map((g) => [g.id, g.value(d)]));
  const fresh = BADGES.filter((b) => !(b.id in earned) && (values.get(b.group) ?? 0) >= b.goal);
  if (!fresh.length) return { earned, fresh };
  const next = { ...earned };
  for (const b of fresh) next[b.id] = now;
  return { earned: next, fresh };
}
