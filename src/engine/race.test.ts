import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { courseFacts, courseOf, emptyRace, fairTimeMs, finishRace, flapsBy, ghostFlaps, ghostKey, medalFor, migrateGhosts, nextRival, raceBonus, racePace, rivalFlaps, RIVALS, speedTitle } from './race';
import { Progress } from './scheduler';
import { buildSession } from './session';

const f = factById;

describe('fair times', () => {
  it('gives hard facts more time than easy ones', () => {
    expect(fairTimeMs(f('mul:1:1'))).toBeLessThan(fairTimeMs(f('mul:2:7')));
    expect(fairTimeMs(f('mul:2:7'))).toBeLessThan(fairTimeMs(f('mul:6:8')));
  });
  it('gives division a little longer than multiplication', () => {
    expect(fairTimeMs(f('div:2:7'))).toBeGreaterThan(fairTimeMs(f('mul:2:7')));
  });
  it('never gives more time than the speed goal', () => {
    for (const fact of ALL_FACTS) {
      expect(fairTimeMs(fact)).toBeLessThanOrEqual(3000);
    }
    expect(fairTimeMs(f('mul:7:8'))).toBe(3000);
  });
});

describe('racing', () => {
  const easy = [f('mul:1:1'), f('mul:2:2'), f('mul:10:3')];
  const hard = [f('mul:7:8'), f('mul:6:8'), f('mul:12:7')];

  it('rates the same effort the same on easy and hard facts', () => {
    const at = (facts: typeof easy, pace: number) => facts.map((fact) => ({ fact, ms: fairTimeMs(fact) * pace }));
    expect(racePace(at(easy, 1.2))).toBe(1.2);
    expect(racePace(at(hard, 1.2))).toBe(1.2);
  });

  it('moves opponents one whole flap at a time', () => {
    expect(flapsBy([1000, 2000, 500], 0)).toBe(0);
    expect(flapsBy([1000, 2000, 500], 999)).toBe(0);
    expect(flapsBy([1000, 2000, 500], 1000)).toBe(1);
    expect(flapsBy([1000, 2000, 500], 2999)).toBe(1);
    expect(flapsBy([1000, 2000, 500], 99999)).toBe(3);
  });

  it('replays the ghost exactly, and fills a longer race with its average', () => {
    expect(ghostFlaps([1000, 2000, 1500], 2)).toEqual([1000, 2000]);
    expect(ghostFlaps([1000, 2000], 4)).toEqual([1000, 2000, 1500, 1500]);
  });

  it('flaps rivals at their pace on the very facts the kid gets', () => {
    const times = rivalFlaps(1, [...easy, ...hard], 6, () => 0.5);
    expect(times).toHaveLength(6);
    expect(times[0]).toBe(Math.round(fairTimeMs(easy[0]) * (0.75 + 0.5 * 0.55)));
    expect(times[3]).toBe(Math.round(fairTimeMs(hard[0]) * (0.75 + 0.5 * 0.55)));
    for (const [i, t] of rivalFlaps(1.5, hard, 3).entries()) {
      expect(t).toBeGreaterThanOrEqual(fairTimeMs(hard[i]) * 1.5 * 0.75 - 1);
      expect(t).toBeLessThanOrEqual(fairTimeMs(hard[i]) * 1.5 * 1.3 + 1);
    }
  });

  it('is slower against a hard draw of facts than an easy one', () => {
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    expect(sum(rivalFlaps(1, hard, 3, () => 0.5))).toBeGreaterThan(sum(rivalFlaps(1, easy, 3, () => 0.5)));
  });

  it('pays a bigger bonus for a longer race', () => {
    expect([10, 20, 30].map(raceBonus)).toEqual([5, 10, 15]);
    const flaps = (n: number) => Array.from({ length: n }, () => ({ fact: hard[0], ms: 100 }));
    expect(finishRace(emptyRace(), 'solo', 'hard', 30, flaps(30), []).result.bonus).toBe(15);
    expect(finishRace(emptyRace(), 'rival', 'hard', 10, flaps(10), [1]).result.bonus).toBe(0);
  });

  it('keeps a ghost for each course and length, and moves old ghosts by their length', () => {
    expect(ghostKey('hard', 20)).toBe('hard:20');
    expect(migrateGhosts({ hard: [1, 2, 3], 'easy:10': [4], mixed: [] })).toEqual({ 'hard:3': [1, 2, 3], 'easy:10': [4] });
    expect(migrateGhosts(undefined)).toEqual({});
  });

  it('unlocks the next rival on a win, and saves a ghost for that course', () => {
    const flaps = hard.map((fact) => ({ fact, ms: 1000 }));
    const { race, result } = finishRace(emptyRace(), 'rival', 'hard', 3, flaps, [9000, 9000, 9000]);
    expect(result.won).toBe(true);
    expect(result.rival).toBe(RIVALS[0].name);
    expect(result.margin).toBe(24);
    expect(race.rivalsBeaten).toBe(1);
    expect(nextRival(race)).toBe(1);
    expect(race.ghosts['hard:3']).toEqual([1000, 1000, 1000]);
    expect(race.ghosts['easy:3']).toBeUndefined();
    expect(result.bonus).toBe(2);
    expect(result.newBest).toBe(true);
    const lost = finishRace(race, 'rival', 'hard', 3, flaps, [10]);
    expect(lost.result.won).toBe(false);
    expect(lost.race.rivalsBeaten).toBe(1);
    expect(lost.result.newBest).toBe(false);
  });

  it('gives solo medals by pace', () => {
    expect(medalFor(0.9)).toBe('gold');
    expect(medalFor(1.2)).toBe('silver');
    expect(medalFor(2)).toBe('bronze');
    const solo = finishRace(emptyRace(), 'solo', 'mixed', 1, [{ fact: hard[0], ms: 100 }], []);
    expect(solo.result.won).toBe(true);
    expect(solo.race.golds).toBe(1);
  });

  it('gets faster up the rival ladder', () => {
    for (let i = 1; i < RIVALS.length; i++) expect(RIVALS[i].pace).toBeLessThan(RIVALS[i - 1].pace);
  });
});

describe('courses', () => {
  it('sorts facts by their easier factor', () => {
    expect(courseOf(f('mul:2:7'))).toBe('easy');
    expect(courseOf(f('mul:3:8'))).toBe('medium');
    expect(courseOf(f('mul:7:8'))).toBe('hard');
    expect(courseOf(f('div:7:8'))).toBe('hard');
  });
  it('puts every fact on exactly one course', () => {
    const n = (c: 'easy' | 'medium' | 'hard') => courseFacts(c, ALL_FACTS).length;
    expect(n('easy') + n('medium') + n('hard')).toBe(ALL_FACTS.length);
    expect(courseFacts('mixed', ALL_FACTS)).toHaveLength(ALL_FACTS.length);
  });
  it('builds a race from one course only', () => {
    const seen: Progress = Object.fromEntries(ALL_FACTS.map((x) => [x.id, { box: 2, due: 0, seen: 2, correct: 2, avgMs: 2000, lastSeen: 0 }]));
    for (const progress of [{}, seen]) {
      const facts = buildSession(progress, Date.now(), { length: 20, only: (x) => courseOf(x) === 'hard' });
      expect(facts).toHaveLength(20);
      expect(facts.every((x) => courseOf(x) === 'hard')).toBe(true);
    }
  });
});

describe('speed title', () => {
  const at = (pace: number, ids: string[]): Progress =>
    Object.fromEntries(ids.map((id) => [id, { box: 3, due: 0, seen: 4, correct: 4, avgMs: fairTimeMs(f(id)) * pace, lastSeen: 0 }]));
  const easyIds = ALL_FACTS.filter((x) => x.op === 'mul' && (x.a === 1 || x.a === 2)).map((x) => x.id);
  const hardIds = ALL_FACTS.filter((x) => x.op === 'mul' && courseOf(x) === 'hard').map((x) => x.id);

  it('waits until there are enough facts', () => {
    expect(speedTitle(at(1, easyIds.slice(0, 3)), ALL_FACTS)).toBeNull();
  });
  it('is the same at the same pace on easy or hard tables', () => {
    expect(speedTitle(at(1, easyIds), ALL_FACTS)?.name).toBe('Sky Dasher');
    expect(speedTitle(at(1, hardIds), ALL_FACTS)?.name).toBe('Sky Dasher');
  });
  it('needs some Hard facts for the top two titles', () => {
    const easyOnly = speedTitle(at(0.7, easyIds), ALL_FACTS);
    expect(easyOnly?.name).toBe('Sky Dasher');
    expect(easyOnly?.needsHard).toBe(true);
    expect(easyOnly?.next).toBe('Storm Rider');
    const someHard = speedTitle({ ...at(0.7, easyIds), ...at(0.7, hardIds.slice(0, 10)) }, ALL_FACTS);
    expect(someHard?.name).toBe('Comet Wing');
    expect(someHard?.needsHard).toBe(false);
    expect(speedTitle({ ...at(0.7, easyIds), ...at(0.7, hardIds.slice(0, 9)) }, ALL_FACTS)?.needsHard).toBe(true);
  });
  it('goes from slowest to fastest', () => {
    expect(speedTitle(at(3, easyIds), ALL_FACTS)?.name).toBe('Egg Wobbler');
    expect(speedTitle(at(0.7, hardIds), ALL_FACTS)?.name).toBe('Comet Wing');
    expect(speedTitle(at(0.7, hardIds), ALL_FACTS)?.next).toBeUndefined();
    expect(speedTitle(at(1, easyIds), ALL_FACTS)?.next).toBe('Storm Rider');
  });
});

describe('course setting', () => {
  it('moves old "just one table" saves to that table\'s course', async () => {
    const { normalizeSave } = await import('../storage/types');
    const old = (focusTable: number) => normalizeSave('Kid', { settings: { muted: false, length: 20, fastMs: 3000, focusTable } as never });
    expect(old(0).settings.course).toBe('mixed');
    expect(old(2).settings.course).toBe('easy');
    expect(old(9).settings.course).toBe('medium');
    expect(old(7).settings.course).toBe('hard');
    expect('focusTable' in old(7).settings).toBe(false);
    expect(normalizeSave('Kid', undefined).settings.course).toBe('mixed');
  });
});
