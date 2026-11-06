import { describe, expect, it } from 'vitest';
import { nightVisionClue, spotDistance } from './lantern';

describe('Night Vision', () => {
  it('never gives a hot clue or lands on the monster', () => {
    for (const size of [3, 4, 5]) {
      for (let monster = 0; monster < size * size; monster++) {
        for (let r = 0; r < 1; r += 0.05) {
          const { spot, clue } = nightVisionClue(size, monster, () => r);
          expect(spotDistance(size, spot, monster)).toBeGreaterThanOrEqual(2);
          expect(clue).not.toBe('hot');
        }
      }
    }
  });

  it('tells the truth about the spot it shows', () => {
    // 3×3, monster in the middle: every far spot is a corner, two steps away.
    for (let r = 0; r < 1; r += 0.1) expect(nightVisionClue(3, 4, () => r).clue).toBe('warm');
    // 4×4, monster in a corner: the opposite corner is cold.
    expect(nightVisionClue(4, 0, () => 0.999)).toEqual({ spot: 15, clue: 'cold' });
  });
});
