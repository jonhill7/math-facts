import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { shotClockMs } from './league';
import { fairTimeMs } from './race';
import { beatGoal, speedGoalMs } from './speed';

const f = factById;

describe('speed goals', () => {
  it('are the same goals Sky Race races against', () => {
    for (const fact of ALL_FACTS) expect(fairTimeMs(fact, 2000)).toBe(speedGoalMs(fact, 2000));
  });
  it('count an answer as fast only when it beats the fact goal', () => {
    const easy = f('mul:2:3');
    const hard = f('mul:7:8');
    expect(beatGoal(easy, true, 2500)).toBe(false); // too slow for an easy fact
    expect(beatGoal(hard, true, 2500)).toBe(true);
    expect(beatGoal(easy, true, speedGoalMs(easy))).toBe(true);
    expect(beatGoal(hard, false, 500)).toBe(false);
  });
  it('give the keeper a longer shot clock on hard facts, always past the goal', () => {
    for (let level = 0; level < 10; level++) {
      const easy = speedGoalMs(f('mul:2:3'));
      const hard = speedGoalMs(f('mul:7:8'));
      expect(shotClockMs(hard, level)).toBeGreaterThan(shotClockMs(easy, level));
      expect(shotClockMs(easy, level)).toBeGreaterThanOrEqual(easy + 600);
    }
  });
});
