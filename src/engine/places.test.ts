import { describe, expect, it } from 'vitest';
import { placeGoal, PLACES, unlocked } from './places';

describe('world tour', () => {
  it('lists places in the order they open', () => {
    for (let i = 1; i < PLACES.length; i++) {
      expect(PLACES[i].need).toBeGreaterThanOrEqual(PLACES[i - 1].need);
      expect(PLACES[i].mastered ?? 0).toBeGreaterThanOrEqual(PLACES[i - 1].mastered ?? 0);
    }
    // Whatever a kid knows, the open places are the start of the route, never a gap.
    for (let known = 0; known <= 288; known += 8) {
      for (let mastered = 0; mastered <= known; mastered += 8) {
        const open = PLACES.map((p) => unlocked(p, known, mastered));
        expect(open.indexOf(false) === -1 || open.slice(open.indexOf(false)).every((o) => !o)).toBe(true);
      }
    }
  });

  it('asks for facts known first, then mastered, for the far places', () => {
    const norway = PLACES.find((p) => p.id === 'norway')!;
    expect(placeGoal(norway, 200, 150)).toMatch(/^Know 240/);
    expect(placeGoal(norway, 260, 150)).toMatch(/^Master 225/);
  });
});
