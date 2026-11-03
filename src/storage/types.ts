import { Progress } from '../engine/scheduler';
import { emptyStreak, Streak } from '../engine/streak';

export interface Stats {
  sessions: number;
  goals: number;
  topCorners: number;
  monstersFound: number;
  tickles: number;
  snacks: number; // food the companion dragon has eaten
  matchesWon: number;
  lastPlayed: number;
}

export interface SaveData {
  name: string;
  progress: Progress;
  stats: Stats;
  companion?: number; // the times table of the kid's chosen dragon
  settings: Settings;
  streak: Streak;
  dragonNames: Record<string, string>; // names kids give their dragons, keyed by times table
}

export interface Settings {
  muted: boolean;
}

export const defaultSettings = (): Settings => ({ muted: false });

export const emptyStats = (): Stats => ({
  sessions: 0,
  goals: 0,
  topCorners: 0,
  monstersFound: 0,
  tickles: 0,
  snacks: 0,
  matchesWon: 0,
  lastPlayed: 0,
});

export const emptySave = (name: string): SaveData => ({ name, progress: {}, stats: emptyStats(), settings: defaultSettings(), streak: emptyStreak(), dragonNames: {} });

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
  };
}

// Where a player's progress lives: this browser (guests) or the cloud (Google sign-in).
export interface ProgressStore {
  load(): Promise<SaveData>;
  save(data: SaveData): Promise<void>;
}
