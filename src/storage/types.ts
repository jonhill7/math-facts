import { Progress } from '../engine/scheduler';

export interface Stats {
  sessions: number;
  goals: number;
  topCorners: number;
  monstersFound: number;
  tickles: number;
  snacks: number; // food the companion dragon has eaten
  lastPlayed: number;
}

export interface SaveData {
  name: string;
  progress: Progress;
  stats: Stats;
  companion?: number; // the times table of the kid's chosen dragon
}

export const emptyStats = (): Stats => ({
  sessions: 0,
  goals: 0,
  topCorners: 0,
  monstersFound: 0,
  tickles: 0,
  snacks: 0,
  lastPlayed: 0,
});

export const emptySave = (name: string): SaveData => ({ name, progress: {}, stats: emptyStats() });

// Where a player's progress lives: this browser (guests) or the cloud (Google sign-in).
export interface ProgressStore {
  load(): Promise<SaveData>;
  save(data: SaveData): Promise<void>;
}
