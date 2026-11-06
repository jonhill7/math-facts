import { Progress } from '../engine/scheduler';
import { emptyStreak, Streak } from '../engine/streak';
import { emptyLeague, League } from '../engine/league';
import { emptyQuests, QuestState } from '../engine/quests';
import { emptyShop, ShopState } from '../engine/shop';
import { EGG_ORDER, Hoard } from '../engine/dragons';
import { emptyRace, RaceState } from '../engine/race';
import { Earned } from '../engine/badges';

export interface Stats {
  sessions: number;
  goals: number;
  topCorners: number;
  saves: number; // shots stopped in Penalty Saves
  monstersFound: number;
  tickles: number;
  snacks: number; // food the companion dragon has eaten
  matchesWon: number;
  powers: number; // power moves used
  bossesBeaten: number;
  bestStreak: number; // longest daily streak ever, kept after a streak ends
  perfectGames: number; // games with every answer right
  bestFastGame: number; // most super-fast answers in one game
  ghostWins: number; // Sky Races won against the kid's own ghost
  lastPlayed: number;
}

export interface SaveData {
  name: string;
  progress: Progress;
  stats: Stats;
  companion?: number; // species id of the kid's chosen egg or dragon
  hoard: Hoard; // snacks (experience) each dragon has eaten, by species id
  settings: Settings;
  streak: Streak;
  dragonNames: Record<string, string>; // names kids give their dragons, keyed by species id
  league: League;
  quests: QuestState;
  shop: ShopState;
  place: string; // where on the world tour the kid is playing
  race: RaceState; // Sky Race: the ghost, rivals beaten and best pace
  badges: Earned; // when each badge was earned; badges are never taken away
}

export interface Settings {
  muted: boolean;
  focusTable: number; // 0 = all tables
  length: number; // questions per game
  fastMs: number; // answers faster than this count as fluent
}

export const defaultSettings = (): Settings => ({ muted: false, focusTable: 0, length: 20, fastMs: 3000 });

export const emptyStats = (): Stats => ({
  sessions: 0,
  goals: 0,
  topCorners: 0,
  saves: 0,
  monstersFound: 0,
  tickles: 0,
  snacks: 0,
  matchesWon: 0,
  powers: 0,
  bossesBeaten: 0,
  bestStreak: 0,
  perfectGames: 0,
  bestFastGame: 0,
  ghostWins: 0,
  lastPlayed: 0,
});

export const emptySave = (name: string): SaveData => ({ name, progress: {}, stats: emptyStats(), settings: defaultSettings(), streak: emptyStreak(), dragonNames: {}, hoard: {}, league: emptyLeague(), quests: emptyQuests(), shop: emptyShop(), place: 'meadow', race: emptyRace(), badges: {} });

// Fill in anything an older save is missing, so new features never crash on old data.
export function normalizeSave(name: string, raw: Partial<SaveData> | undefined): SaveData {
  const base = emptySave(name);
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    name,
    progress: raw.progress ?? {},
    stats: { ...base.stats, ...raw.stats },
    settings: { ...base.settings, ...raw.settings },
    streak: { ...base.streak, ...raw.streak },
    dragonNames: raw.dragonNames ?? {},
    // Saves from before dragons had their own experience: the chosen dragon
    // keeps every snack eaten so far, so nobody's dragon shrinks.
    hoard: raw.hoard ?? (raw.stats?.snacks ? { [String(raw.companion ?? EGG_ORDER[0])]: raw.stats.snacks } : {}),
    league: { ...base.league, ...raw.league },
    quests: { ...base.quests, ...raw.quests },
    shop: { ...base.shop, ...raw.shop },
    place: raw.place ?? base.place,
    race: { ...base.race, ...raw.race, ghosts: raw.race?.ghosts ?? {} },
    badges: raw.badges ?? {},
  };
}

// Where a player's progress lives: this browser (guests) or the cloud (Google sign-in).
export interface ProgressStore {
  load(): Promise<SaveData>;
  save(data: SaveData): Promise<void>;
}
