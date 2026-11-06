import { describe, expect, it } from 'vitest';
import { allDragons, EGG_ORDER, levelFor } from '../engine/dragons';
import { emptySave, normalizeSave, PROGRESSION } from './types';

describe('older saves', () => {
  it('keep every dragon level and egg when moving to the longer progression', () => {
    const raw = { ...emptySave('Sam'), progression: undefined, hoard: { '7': 4350, '2': 455 }, stats: { ...emptySave('Sam').stats, snacks: 1800 } };
    const save = normalizeSave('Sam', raw);
    expect(save.progression).toBe(PROGRESSION);
    expect(levelFor(save.hoard['7']).level).toBe(30);
    expect(levelFor(save.hoard['2']).level).toBe(10);
    // 1800 snacks found all 12 eggs on the old pace.
    expect(allDragons(save.hoard, save.stats.snacks).filter((d) => d.stage !== 'none')).toHaveLength(EGG_ORDER.length);
  });

  it('are only moved once', () => {
    const once = normalizeSave('Sam', { ...emptySave('Sam'), progression: undefined, hoard: { '7': 455 } });
    expect(normalizeSave('Sam', once).hoard).toEqual(once.hoard);
  });

  it('leave new players alone', () => {
    expect(normalizeSave('Sam', undefined).hoard).toEqual({});
    expect(normalizeSave('Sam', emptySave('Sam')).hoard).toEqual({});
  });
});
