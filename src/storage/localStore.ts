import { emptySave, normalizeSave, ProgressStore, SaveData } from './types';

// Guest players: progress is kept in this browser only.
const KEY_PREFIX = 'math-facts:guest:';

export function listGuests(): string[] {
  const names: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) names.push(key.slice(KEY_PREFIX.length));
    }
  } catch {
    // Storage blocked (private mode): no saved guests.
  }
  return names.sort();
}

export function localStore(name: string): ProgressStore {
  const key = KEY_PREFIX + name;
  return {
    async load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          return normalizeSave(name, JSON.parse(raw) as Partial<SaveData>);
        }
      } catch {
        // Fall through to a fresh save.
      }
      return emptySave(name);
    },
    async save(data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Storage full or blocked: keep playing without saving.
      }
    },
  };
}
