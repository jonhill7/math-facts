import { describe, expect, it } from 'vitest';
import { dragonState, speciesById } from './dragons';
import { Critter, GROUND, isNight, offNest, startMeadow, step, syncMeadow, tapDragon, throwBall, walkMs } from './meadow';

// A predictable "random" number source.
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const dragon = (id: number, snacks: number) => dragonState(speciesById(id), { [String(id)]: snacks }, true);
const EGG = 0; // level 1
const GROWN = 500; // level 10

function run(cs: Critter[], from: number, ms: number, rand = seeded()) {
  const seen: Critter[][] = [];
  for (let t = from; t <= from + ms; t += 300) {
    cs = step(cs, t, rand);
    seen.push(cs);
  }
  return seen;
}

describe('the meadow', () => {
  it('puts eggs in the nest and dragons out on the grass', () => {
    const cs = startMeadow([dragon(7, EGG), dragon(2, GROWN), dragonState(speciesById(8), {}, false)], 0, seeded());
    expect(cs.map((c) => c.id)).toEqual([7, 2]); // the one not found yet isn't there
    expect(cs[0].x).toBeLessThan(25);
    expect(cs[1].x).toBeGreaterThanOrEqual(GROUND.left);
  });

  it('keeps eggs in the nest and everyone on the grass', () => {
    const start = startMeadow([dragon(7, EGG), dragon(2, GROWN), dragon(8, GROWN), dragon(5, 100)], 0, seeded(3));
    const egg = start[0];
    for (const cs of run(start, 0, 120_000)) {
      expect(cs[0].x).toBe(egg.x);
      expect(cs[0].y).toBe(egg.y);
      for (const c of cs) {
        expect(c.x).toBeGreaterThanOrEqual(GROUND.left - 0.01);
        expect(c.x).toBeLessThanOrEqual(GROUND.right + 0.01);
        expect(['walk', 'play', 'fetch'].includes(c.activity) && c.stage === 'egg').toBe(false);
      }
    }
  });

  it('has dragons walk, nap and play together', () => {
    const start = startMeadow([dragon(2, GROWN), dragon(8, GROWN), dragon(5, GROWN)], 0, seeded(7));
    const seen = new Set(run(start, 0, 300_000).flatMap((cs) => cs.map((c) => c.activity)));
    expect(seen).toContain('walk');
    expect(seen).toContain('nap');
    expect(seen).toContain('play');
  });

  it('plays in pairs, facing each other', () => {
    const start = startMeadow([dragon(2, GROWN), dragon(8, GROWN)], 0, seeded(11));
    const playing = run(start, 0, 300_000).find((cs) => cs.every((c) => c.activity === 'play'));
    expect(playing).toBeDefined();
    const [a, b] = playing!;
    expect(a.partner).toBe(b.id);
    expect(b.partner).toBe(a.id);
    const left = a.x < b.x ? a : b;
    const right = left === a ? b : a;
    expect(left.facing).toBe(1);
    expect(right.facing).toBe(-1);
  });

  it('wakes a dragon that gets tapped', () => {
    const [c] = startMeadow([dragon(10, GROWN)], 0, seeded());
    const after = tapDragon([{ ...c, activity: 'nap', until: 99_999 }], 10, 1000);
    expect(after[0].activity).toBe('happy');
    expect(after[0].until).toBe(2600);
  });

  it('sends the nearest awake dragon for the ball', () => {
    const base = startMeadow([dragon(2, GROWN), dragon(8, GROWN), dragon(7, EGG)], 0, seeded());
    const near = { ...base[0], x: 80, y: 70, activity: 'idle' as const };
    const far = { ...base[1], x: 20, y: 70, activity: 'idle' as const };
    const { critters, ball } = throwBall([near, far, base[2]], 85, 70, 0);
    expect(ball.chaser).toBe(2);
    expect(critters[0].activity).toBe('walk');
    expect(critters[0].then?.activity).toBe('fetch');
    // A sleepy dragon only goes if nobody else is awake.
    const nap = throwBall([{ ...near, activity: 'nap' }, far], 85, 70, 0);
    expect(nap.ball.chaser).toBe(8);
    // Eggs can't fetch.
    expect(throwBall([base[2]], 50, 70, 0).ball.chaser).toBeUndefined();
  });

  it('walks bigger dragons faster', () => {
    const from = { x: 10, y: 60 };
    expect(walkMs({ ...from, stage: 'grown' }, 60, 60)).toBeLessThan(walkMs({ ...from, stage: 'hatchling' }, 60, 60));
  });

  it('adds new eggs and grows dragons without moving anyone', () => {
    const cs = startMeadow([dragon(7, 20)], 0, seeded());
    const next = syncMeadow(cs, [dragon(7, 40), dragon(2, EGG)], 500, seeded());
    expect(next).toHaveLength(2);
    expect(next[0].stage).toBe('hatchling');
    expect(next[0].x).toBe(cs[0].x);
    expect(next[0].activity).toBe('happy');
    expect(next[1].stage).toBe('egg');
  });

  it('knows when it is night', () => {
    expect(isNight(new Date(2026, 0, 1, 21))).toBe(true);
    expect(isNight(new Date(2026, 0, 1, 12))).toBe(false);
  });
});

describe('the nest', () => {
  it('is only for eggs', () => {
    const start = startMeadow([dragon(7, EGG), dragon(2, GROWN), dragon(8, GROWN)], 0, seeded(5));
    for (const cs of run(start, 0, 200_000, seeded(9))) {
      for (const c of cs.filter((c) => c.stage !== 'egg' && c.activity !== 'walk')) {
        expect(c.x === offNest(c.x, c.y)).toBe(true);
      }
    }
  });
});
