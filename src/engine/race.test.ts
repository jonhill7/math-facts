import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { courseFacts, courseOf, emptyRace, fairTimeMs, finishRace, flapsBy, ghostFlaps, medalFor, nextRival, racePace, rivalFlaps, RIVALS, speedTitle } from './race';
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
      expect(fairTimeMs(fact, 2000)).toBeLessThanOrEqual(2000);
    }
    expect(fairTimeMs(f('mul:7:8'))).toBe(3000);
  });
  it('scales with the speed goal', () => {
    expect(fairTimeMs(f('mul:6:8'), 6000)).toBe(2 * fairTimeMs(f('mul:6:8'), 3000));
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

  it('flaps rivals around their pace', () => {
    const times = rivalFlaps(1, 2000, 50, () => 0.5);
    expect(times).toHaveLength(50);
    expect(times[0]).toBe(Math.round(2000 * (0.75 + 0.5 * 0.55)));
    for (const t of rivalFlaps(1.5, 2000, 50)) {
      expect(t).toBeGreaterThanOrEqual(2000 * 1.5 * 0.75 - 1);
      expect(t).toBeLessThanOrEqual(2000 * 1.5 * 1.3 + 1);
    }
  });

  it('unlocks the next rival on a win, and saves a ghost for that course', () => {
    const flaps = hard.map((fact) => ({ fact, ms: 1000 }));
    const { race, result } = finishRace(emptyRace(), 'rival', 'hard', flaps, [9000, 9000, 9000]);
    expect(result.won).toBe(true);
    expect(result.rival).toBe(RIVALS[0].name);
    expect(result.margin).toBe(24);
    expect(race.rivalsBeaten).toBe(1);
    expect(nextRival(race)).toBe(1);
    expect(race.ghosts.hard).toEqual([1000, 1000, 1000]);
    expect(race.ghosts.easy).toBeUndefined();
    expect(result.newBest).toBe(true);
    const lost = finishRace(race, 'rival', 'hard', flaps, [10]);
    expect(lost.result.won).toBe(false);
    expect(lost.race.rivalsBeaten).toBe(1);
    expect(lost.result.newBest).toBe(false);
  });

  it('gives solo medals by pace', () => {
    expect(medalFor(0.9)).toBe('gold');
    expect(medalFor(1.2)).toBe('silver');
    expect(medalFor(2)).toBe('bronze');
    const solo = finishRace(emptyRace(), 'solo', 'mixed', [{ fact: hard[0], ms: 100 }], []);
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
  const hardIds = ALL_FACTS.filter((x) => x.op === 'mul' && (x.a === 7 || x.a === 8)).map((x) => x.id);

  it('waits until there are enough facts', () => {
    expect(speedTitle(at(1, easyIds.slice(0, 3)), ALL_FACTS)).toBeNull();
  });
  it('is the same at the same pace on easy or hard tables', () => {
    expect(speedTitle(at(1, easyIds), ALL_FACTS)?.name).toBe('Sky Dasher');
    expect(speedTitle(at(1, hardIds), ALL_FACTS)?.name).toBe('Sky Dasher');
  });
  it('goes from slowest to fastest', () => {
    expect(speedTitle(at(3, easyIds), ALL_FACTS)?.name).toBe('Egg Wobbler');
    expect(speedTitle(at(0.7, easyIds), ALL_FACTS)?.name).toBe('Comet Wing');
    expect(speedTitle(at(0.7, easyIds), ALL_FACTS)?.next).toBeUndefined();
    expect(speedTitle(at(1, easyIds), ALL_FACTS)?.next).toBe('Storm Rider');
  });
});
