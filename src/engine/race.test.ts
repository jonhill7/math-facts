import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { emptyRace, fairTimeMs, finishRace, medalFor, nextRival, opponentProgress, opponentTimes, racePace, RIVALS, speedTitle } from './race';
import { Progress } from './scheduler';

const f = factById;

describe('fair times', () => {
  it('gives hard facts more time than easy ones', () => {
    expect(fairTimeMs(f('mul:1:1'))).toBeLessThan(fairTimeMs(f('mul:2:7')));
    expect(fairTimeMs(f('mul:2:7'))).toBeLessThan(fairTimeMs(f('mul:6:8')));
    expect(fairTimeMs(f('mul:7:8'))).toBeLessThan(3500);
  });
  it('gives division a little longer than multiplication', () => {
    expect(fairTimeMs(f('div:7:8'))).toBeGreaterThan(fairTimeMs(f('mul:7:8')));
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

  it('moves opponents along by flaps, with the current fact for flaps not reached yet', () => {
    expect(opponentProgress([1000, 2000], 3000, 0, 5)).toBe(0);
    expect(opponentProgress([1000, 2000], 3000, 2000, 5)).toBe(1.5);
    expect(opponentProgress([1000, 2000], 3000, 4500, 5)).toBe(2.5);
    expect(opponentProgress([1000], 1000, 99999, 3)).toBe(3);
  });

  it('flies a ghost at the pace it flew each flap, on the new facts', () => {
    expect(opponentTimes(hard, [1, 2], 3000)).toEqual([fairTimeMs(hard[0]), 2 * fairTimeMs(hard[1]), 1.5 * fairTimeMs(hard[2])]);
  });

  it('unlocks the next rival on a win, and saves a ghost', () => {
    const flaps = hard.map((fact) => ({ fact, ms: 1000 }));
    const { race, result } = finishRace(emptyRace(), 'rival', flaps, 99999);
    expect(result.won).toBe(true);
    expect(result.rival).toBe(RIVALS[0].name);
    expect(race.rivalsBeaten).toBe(1);
    expect(nextRival(race)).toBe(1);
    expect(race.ghost).toHaveLength(3);
    expect(result.newBest).toBe(true);
    const lost = finishRace(race, 'rival', flaps, 10);
    expect(lost.result.won).toBe(false);
    expect(lost.race.rivalsBeaten).toBe(1);
    expect(lost.result.newBest).toBe(false);
  });

  it('gives solo medals by pace', () => {
    expect(medalFor(0.9)).toBe('gold');
    expect(medalFor(1.2)).toBe('silver');
    expect(medalFor(2)).toBe('bronze');
    const solo = finishRace(emptyRace(), 'solo', [{ fact: hard[0], ms: 100 }], Infinity);
    expect(solo.result.won).toBe(true);
    expect(solo.race.golds).toBe(1);
  });

  it('gets faster up the rival ladder', () => {
    for (let i = 1; i < RIVALS.length; i++) expect(RIVALS[i].pace).toBeLessThan(RIVALS[i - 1].pace);
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
