// Three small daily goals for each kid. They change every day.

export type QuestKey = 'saves' | 'topCorners' | 'monstersFound' | 'fast' | 'powers' | 'matchesWon' | 'games' | 'right';

export interface Quest {
  id: string;
  key: QuestKey;
  target: number;
  text: string;
}

export const QUEST_POOL: Quest[] = [
  { id: 'saves5', key: 'saves', target: 5, text: 'Make 5 saves in Penalty Saves' },
  { id: 'top3', key: 'topCorners', target: 3, text: 'Score 3 top-corner goals' },
  { id: 'found2', key: 'monstersFound', target: 2, text: 'Find the Tickle Monster 2 times' },
  { id: 'fast15', key: 'fast', target: 15, text: 'Answer 15 facts super fast' },
  { id: 'power2', key: 'powers', target: 2, text: 'Use 2 power moves' },
  { id: 'win1', key: 'matchesWon', target: 1, text: 'Win a soccer match' },
  { id: 'games2', key: 'games', target: 2, text: 'Play 2 games' },
  { id: 'right30', key: 'right', target: 30, text: 'Get 30 answers right' },
];

export const QUEST_REWARD = 15; // snacks per finished quest
export const QUESTS_PER_DAY = 3;

export interface QuestState {
  day: string; // local date, YYYY-MM-DD
  counts: Partial<Record<QuestKey, number>>;
  done: string[]; // quest ids finished today
}

export const emptyQuests = (): QuestState => ({ day: '', counts: {}, done: [] });

export function dayOf(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The same kid gets the same quests all day; siblings get different ones.
export function questsFor(day: string, name: string): Quest[] {
  return [...QUEST_POOL].sort((a, b) => hash(day + name + a.id) - hash(day + name + b.id)).slice(0, QUESTS_PER_DAY);
}

// Today's state, starting fresh on a new day.
export function today(state: QuestState, now: number): QuestState {
  const day = dayOf(now);
  return state.day === day ? state : { day, counts: {}, done: [] };
}

// Count progress toward today's quests. Returns the new state and any quests it finished.
export function bumpQuest(state: QuestState, name: string, key: QuestKey, n: number, now: number): { state: QuestState; finished: Quest[] } {
  const s = today(state, now);
  const counts = { ...s.counts, [key]: (s.counts[key] ?? 0) + n };
  const finished = questsFor(s.day, name).filter((q) => !s.done.includes(q.id) && (counts[q.key] ?? 0) >= q.target);
  return { state: { ...s, counts, done: [...s.done, ...finished.map((q) => q.id)] }, finished };
}
