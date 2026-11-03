// A daily practice streak that forgives one missed day each week, so a sick
// day or a busy evening doesn't wipe out weeks of effort.

export interface Streak {
  count: number; // days in a row (rest days don't count, but don't break it)
  lastDay: string; // last practice day, as YYYY-MM-DD in local time
  restWeek: string; // the week (Monday's date) in which the free rest day was used
}

export const emptyStreak = (): Streak => ({ count: 0, lastDay: '', restWeek: '' });

export function dayKey(t: number): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function weekKey(day: string): string {
  const d = parseDay(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
  return dayKey(d.getTime());
}

// Call when a practice session finishes.
export function practiced(streak: Streak, now: number): Streak {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;
  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : Infinity;
  if (gap === 1) return { ...streak, count: streak.count + 1, lastDay: today };
  const missed = parseDay(streak.lastDay || today);
  missed.setDate(missed.getDate() + 1);
  const restWeek = weekKey(dayKey(missed.getTime()));
  if (gap === 2 && streak.restWeek !== restWeek) {
    return { count: streak.count + 1, lastDay: today, restWeek };
  }
  return { count: 1, lastDay: today, restWeek: streak.restWeek };
}

// What the home screen should show today.
export function streakStatus(streak: Streak, now: number): { count: number; doneToday: boolean; atRisk: boolean } {
  const today = dayKey(now);
  if (!streak.lastDay) return { count: 0, doneToday: false, atRisk: false };
  const gap = daysBetween(streak.lastDay, today);
  if (gap === 0) return { count: streak.count, doneToday: true, atRisk: false };
  if (gap === 1) return { count: streak.count, doneToday: false, atRisk: false };
  if (gap === 2) {
    const missed = parseDay(streak.lastDay);
    missed.setDate(missed.getDate() + 1);
    const canRest = streak.restWeek !== weekKey(dayKey(missed.getTime()));
    return { count: canRest ? streak.count : 0, doneToday: false, atRisk: canRest };
  }
  return { count: 0, doneToday: false, atRisk: false };
}
