import { describe, expect, it } from 'vitest';
import { ALL_FACTS, factById } from './facts';
import { hintFor } from './hints';
import { DAY_MS, recordAnswer, startOfDay, Progress } from './scheduler';
import { buildSession, newFactCandidates, requeueMiss, RETRY_GAP } from './session';

const NOW = new Date('2026-11-03T18:00:00').getTime();
const seeded = () => {
  let s = 42;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

describe('facts', () => {
  it('has every multiplication and division fact up to 12', () => {
    expect(ALL_FACTS).toHaveLength(288);
    expect(factById('mul:7:8').answer).toBe(56);
    expect(factById('div:7:8').text).toBe('56 ÷ 7');
    expect(factById('div:7:8').answer).toBe(8);
  });
});

describe('scheduler', () => {
  it('skips a brand-new fact ahead when it is answered fast', () => {
    const s = recordAnswer(undefined, true, 1500, NOW);
    expect(s.box).toBe(3);
    expect(s.due).toBe(startOfDay(NOW) + 3 * DAY_MS);
  });

  it('moves up one box on a fast correct answer', () => {
    const s = recordAnswer({ box: 2, due: NOW, seen: 3, correct: 2, avgMs: 2000, lastSeen: 0 }, true, 2000, NOW);
    expect(s.box).toBe(3);
  });

  it('keeps the box on a slow correct answer', () => {
    const s = recordAnswer({ box: 3, due: NOW, seen: 3, correct: 3, avgMs: 2000, lastSeen: 0 }, true, 6000, NOW);
    expect(s.box).toBe(3);
  });

  it('sends a missed fact back to box 1, due right away', () => {
    const s = recordAnswer({ box: 4, due: NOW, seen: 5, correct: 5, avgMs: 2000, lastSeen: 0 }, false, 2000, NOW);
    expect(s.box).toBe(1);
    expect(s.due).toBe(NOW);
  });

  it('never goes past the mastered box', () => {
    const s = recordAnswer({ box: 5, due: NOW, seen: 9, correct: 9, avgMs: 2000, lastSeen: 0 }, true, 1000, NOW);
    expect(s.box).toBe(5);
  });
});

describe('sessions', () => {
  it('starts a new kid with a placement check from easy to hard', () => {
    const session = buildSession({}, NOW, { random: seeded() });
    expect(session).toHaveLength(20);
    expect(new Set(session.map((f) => f.id)).size).toBe(20);
    expect(session.every((f) => f.op === 'mul')).toBe(true);
    expect(session.some((f) => f.a === 12 || f.b === 12)).toBe(true);
  });

  it('fills a session with extra practice when little is due', () => {
    const progress: Progress = {
      'mul:2:3': { box: 1, due: NOW + DAY_MS, seen: 1, correct: 0, avgMs: 0, lastSeen: NOW },
    };
    const session = buildSession(progress, NOW, { random: seeded() });
    expect(session).toHaveLength(20);
    expect(new Set(session.map((f) => f.id)).size).toBe(20);
  });

  it('puts due reviews first and adds only a few new facts', () => {
    const progress: Progress = {};
    const reviewIds = ['mul:3:4', 'mul:6:7', 'mul:8:9'];
    for (const f of ALL_FACTS.slice(0, 40)) {
      progress[f.id] = { box: 4, due: NOW + 5 * DAY_MS, seen: 3, correct: 3, avgMs: 1500, lastSeen: NOW - DAY_MS };
    }
    for (const id of reviewIds) {
      progress[id] = { box: 2, due: NOW - 1, seen: 2, correct: 1, avgMs: 2500, lastSeen: NOW - DAY_MS };
    }
    const session = buildSession(progress, NOW, { random: seeded() });
    const ids = session.map((f) => f.id);
    for (const id of reviewIds) expect(ids).toContain(id);
    expect(session.filter((f) => !progress[f.id])).toHaveLength(3);
  });

  it('unlocks division only after the multiplication fact is learned', () => {
    expect(newFactCandidates({}).some((f) => f.op === 'div')).toBe(false);
    const progress: Progress = {
      'mul:7:8': { box: 2, due: NOW, seen: 1, correct: 1, avgMs: 2000, lastSeen: NOW },
    };
    expect(newFactCandidates(progress).map((f) => f.id)).toContain('div:7:8');
  });

  it('brings a missed fact back a few questions later', () => {
    const queue = ALL_FACTS.slice(0, 10);
    const next = requeueMiss(queue, 2);
    expect(next).toHaveLength(11);
    expect(next[2 + 1 + RETRY_GAP]).toBe(queue[2]);
  });
});

describe('hints', () => {
  it('uses the easier factor for multiplication', () => {
    expect(hintFor(factById('mul:7:9'))).toContain('70 − 7 = 63');
  });

  it('turns division into a multiplication question', () => {
    expect(hintFor(factById('div:6:7'))).toContain('6 × ? = 42');
  });
});
