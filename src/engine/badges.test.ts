import { describe, expect, it } from 'vitest';
import { BADGES, checkBadges } from './badges';
import { emptySave } from '../storage/types';

const save = () => emptySave('Test');

describe('badges', () => {
  it('have unique ids', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it('starts with none', () => {
    expect(checkBadges({}, save(), 1).fresh).toEqual([]);
  });

  it('earns every step reached at once', () => {
    const d = save();
    d.stats.goals = 120;
    const { earned, fresh } = checkBadges({}, d, 5);
    expect(fresh.map((b) => b.id)).toEqual(['goals-10', 'goals-50', 'goals-100']);
    expect(earned['goals-100']).toBe(5);
  });

  it('never takes a badge away', () => {
    const d = save();
    d.streak.count = 8;
    const first = checkBadges({}, d, 1);
    expect('streak-7' in first.earned).toBe(true);
    d.streak.count = 1; // the streak ended
    const later = checkBadges(first.earned, d, 2);
    expect('streak-7' in later.earned).toBe(true);
    expect(later.fresh).toEqual([]);
    expect(later.earned).toBe(first.earned);
  });

  it('keeps the first day a badge was earned', () => {
    const d = save();
    d.stats.sessions = 1;
    const first = checkBadges({}, d, 100);
    d.stats.sessions = 12;
    const later = checkBadges(first.earned, d, 200);
    expect(later.earned['games-1']).toBe(100);
    expect(later.earned['games-10']).toBe(200);
  });

  it('counts the longest streak ever, not just the current one', () => {
    const d = save();
    d.stats.bestStreak = 31;
    d.streak.count = 2;
    expect(checkBadges({}, d, 1).fresh.map((b) => b.id)).toContain('streak-30');
  });

  it('gives a badge per rival beaten', () => {
    const d = save();
    d.race.rivalsBeaten = 2;
    expect(checkBadges({}, d, 1).fresh.map((b) => b.id)).toEqual(['rivals-1', 'rivals-2']);
  });
});
