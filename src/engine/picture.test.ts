import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { hintFor } from './hints';
import { pictureFor, pictureRows } from './picture';

const live = (id: string) => {
  const p = pictureFor(factById(id));
  return p.bands.filter((b) => b.tone !== 'gone').reduce((n, b) => n + b.rows, 0) * p.cols;
};

describe('picture hints', () => {
  it('draws exactly the right number of dots for every multiplication fact', () => {
    for (const fact of ALL_FACTS.filter((f) => f.op === 'mul')) expect(live(fact.id)).toBe(fact.answer);
  });

  it('draws the whole total for division, with one row showing the answer', () => {
    for (const fact of ALL_FACTS.filter((f) => f.op === 'div')) {
      const p = pictureFor(fact);
      expect(pictureRows(p) * p.cols).toBe(fact.a * fact.b);
      expect(p.cols).toBe(fact.answer);
      expect(pictureRows(p)).toBe(fact.a);
    }
  });

  it('splits 6 × 8 into 5 rows and 1 row of 8', () => {
    const p = pictureFor(factById('mul:6:8'));
    expect(p.cols).toBe(8);
    expect(p.bands.map((b) => b.rows)).toEqual([5, 1]);
    expect(p.sum).toBe('40 + 8 = 48');
  });

  it('uses the easier factor, the same one the words use', () => {
    // 7 × 2 is a double, so it shows 2 rows of 7.
    const p = pictureFor(factById('mul:7:2'));
    expect(p.cols).toBe(7);
    expect(p.bands.map((b) => b.rows)).toEqual([1, 1]);
    expect(hintFor(factById('mul:7:2'))).toContain('7 + 7 = 14');
  });

  it('shows times 9 as times 10 with a row taken away', () => {
    const p = pictureFor(factById('mul:9:7'));
    expect(p.bands.map((b) => [b.rows, b.tone])).toEqual([[9, 'a'], [1, 'gone']]);
    expect(p.sum).toBe('70 − 7 = 63');
  });

  it('counts by 5s in rows of 5', () => {
    const p = pictureFor(factById('mul:5:4'));
    expect(p.cols).toBe(5);
    expect(p.bands.map((b) => b.label)).toEqual(['5', '10', '15', '20']);
  });
});
