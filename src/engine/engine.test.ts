import { describe, expect, it } from 'vitest';
import { allDragons, companionFor, EGG_ORDER, eggsFound, feed, grewBetween, levelFor, migrateHoard, nextEggIn, rankFor, snacksForEgg, snacksForLevel, SPECIES, stageForLevel, tableFactIds } from './dragons';
import { emptyStreak, practiced, streakStatus } from './streak';
import { ALL_FACTS, factById } from './facts';
import { hintFor } from './hints';
import { DAY_MS, recordAnswer, startOfDay, Progress, troubleFacts } from './scheduler';
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

describe('dragons', () => {
  it('gives each table its own facts for focus practice, multiplication both ways plus division', () => {
    const ids = tableFactIds(7);
    expect(ids).toContain('mul:7:8');
    expect(ids).toContain('mul:8:7');
    expect(ids).toContain('div:7:8');
    expect(ids).not.toContain('div:8:7');
    expect(ids).toHaveLength(23 + 12);
  });

  it('starts with one egg and finds more as snacks are earned', () => {
    expect(eggsFound(0)).toBe(1);
    expect(eggsFound(149)).toBe(1);
    expect(eggsFound(150)).toBe(2);
    expect(eggsFound(100000)).toBe(SPECIES.length);
    expect(nextEggIn(160)).toBe(165); // the third egg is 175 after the second, at 325
    expect(nextEggIn(100000)).toBeNull();
  });

  it('waits a little longer for each new egg', () => {
    expect([1, 2, 3, 4].map(snacksForEgg)).toEqual([0, 150, 325, 525]);
    expect(snacksForEgg(SPECIES.length)).toBe(3025);
    expect(eggsFound(3024)).toBe(SPECIES.length - 1);
    expect(eggsFound(3025)).toBe(SPECIES.length);
    const found = allDragons({}, 0).filter((d) => d.stage !== 'none');
    expect(found.map((d) => d.species.id)).toEqual([EGG_ORDER[0]]);
  });

  it('grows the companion by its own experience, not by times table', () => {
    const id = EGG_ORDER[0];
    expect(companionFor({}, 0).stage).toBe('egg');
    expect(stageForLevel(levelFor(36).level)).toBe('hatchling'); // level 3
    expect(stageForLevel(levelFor(180).level)).toBe('young'); // level 6
    expect(stageForLevel(levelFor(540).level)).toBe('grown'); // level 10
    const hoard = feed({}, id, 36);
    expect(companionFor(hoard, 36).stage).toBe('hatchling');
    expect(grewBetween(allDragons({}, 0), allDragons(hoard, 36)).map((d) => d.species.id)).toEqual([id]);
  });

  it('lets the kid pick any egg they have found, and only those', () => {
    const second = EGG_ORDER[1];
    expect(companionFor({}, 150, second).species.id).toBe(second);
    expect(companionFor({}, 0, second).species.id).toBe(EGG_ORDER[0]);
  });

  it('needs more snacks for each level', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, needed: 12 });
    expect(levelFor(12)).toEqual({ level: 2, into: 0, needed: 24 });
    expect(levelFor(41)).toEqual({ level: 3, into: 5, needed: 36 });
    expect(snacksForLevel(10)).toBe(540);
  });

  it('gives grown dragons ranks as they keep leveling', () => {
    expect(rankFor(19)).toBeUndefined();
    expect(rankFor(20)?.name).toBe('Elder');
    expect(rankFor(35)?.name).toBe('Ancient');
    expect(rankFor(40)?.name).toBe('Legendary');
    const id = EGG_ORDER[0];
    const before = allDragons(feed({}, id, snacksForLevel(20) - 1), 0);
    const after = allDragons(feed({}, id, snacksForLevel(20)), 0);
    expect(before[0].rank).toBeUndefined();
    expect(after[0].rank?.name).toBe('Elder');
    expect(grewBetween(before, after).map((d) => d.species.id)).toEqual([id]);
  });

  it('moves old saves to the longer levels without losing a level or an egg', () => {
    // Old scale: 10, 20, 30... so 450 was level 10 and 4350 was level 30.
    const old = { '7': 455, '2': 0, '8': 4350 };
    const moved = migrateHoard(old, 1000); // 1000 snacks found 7 eggs on the old pace
    expect(levelFor(moved['7']).level).toBe(10);
    expect(levelFor(moved['8']).level).toBe(30);
    expect(levelFor(moved['2']).level).toBe(1);
    // Halfway through a level stays about halfway through it.
    const mid = levelFor(migrateHoard({ '7': 450 + 50 }, 0)['7']);
    expect(mid.level).toBe(10);
    expect(mid.into / mid.needed).toBeCloseTo(0.5, 1);
    // Every egg found on the old pace is still found, though the new pace would only give 6.
    expect(eggsFound(1000)).toBe(6);
    const found = allDragons(moved, 1000).filter((d) => d.stage !== 'none').map((d) => d.species.id);
    expect(found).toEqual(EGG_ORDER.slice(0, 7));
    // The next egg is the 8th, which the new pace gives at 1,575 snacks.
    expect(nextEggIn(1000, found.length)).toBe(575);
  });
});

describe('streak', () => {
  const at = (day: string) => new Date(`${day}T17:00:00`).getTime();

  it('counts days in a row', () => {
    let s = practiced(emptyStreak(), at('2026-11-02'));
    s = practiced(s, at('2026-11-02'));
    s = practiced(s, at('2026-11-03'));
    expect(s.count).toBe(2);
  });

  it('forgives one missed day per week', () => {
    let s = practiced(emptyStreak(), at('2026-11-02')); // Monday
    s = practiced(s, at('2026-11-04')); // missed Tuesday
    expect(s.count).toBe(2);
    expect(streakStatus(s, at('2026-11-04')).doneToday).toBe(true);
    s = practiced(s, at('2026-11-06')); // missed Thursday too: no second rest this week
    expect(s.count).toBe(1);
  });

  it('gives a new rest day the next week', () => {
    let s = practiced(emptyStreak(), at('2026-11-02'));
    s = practiced(s, at('2026-11-04'));
    s = practiced(s, at('2026-11-05'));
    s = practiced(s, at('2026-11-06'));
    s = practiced(s, at('2026-11-07'));
    s = practiced(s, at('2026-11-08'));
    s = practiced(s, at('2026-11-10')); // missed Monday of the next week
    expect(s.count).toBe(7);
  });

  it('shows a streak at risk after one missed day', () => {
    const s = practiced(emptyStreak(), at('2026-11-02'));
    expect(streakStatus(s, at('2026-11-04'))).toEqual({ count: 1, doneToday: false, atRisk: true });
    expect(streakStatus(s, at('2026-11-05')).count).toBe(0);
  });
});

describe('focus practice', () => {
  it('only asks facts from the chosen table', () => {
    const session = buildSession({}, NOW, { focusTable: 7, random: seeded() });
    expect(session.length).toBeGreaterThan(0);
    expect(session.every((f) => (f.op === 'mul' ? f.a === 7 || f.b === 7 : f.a === 7))).toBe(true);
  });

  it('adds up to 6 new facts when the kid already knows some of the table', () => {
    const progress: Progress = {
      'mul:7:1': { box: 4, due: NOW + 5 * DAY_MS, seen: 3, correct: 3, avgMs: 1500, lastSeen: NOW - DAY_MS },
    };
    const session = buildSession(progress, NOW, { focusTable: 7, random: seeded() });
    expect(session).toHaveLength(20);
    const newIds = new Set(session.filter((f) => !progress[f.id]).map((f) => f.id));
    expect(newIds.size).toBe(6); // the same 6 new facts come round several times
    for (let i = 1; i < session.length; i++) expect(session[i]).not.toBe(session[i - 1]);
  });
});

describe('trouble facts', () => {
  it('lists the most-missed facts first and leaves out well-known ones', () => {
    const p: Progress = {
      'mul:7:8': { box: 1, due: NOW, seen: 6, correct: 2, avgMs: 4000, lastSeen: NOW },
      'mul:6:7': { box: 2, due: NOW, seen: 3, correct: 2, avgMs: 3500, lastSeen: NOW },
      'mul:2:2': { box: 5, due: NOW, seen: 6, correct: 6, avgMs: 900, lastSeen: NOW },
      'mul:3:3': { box: 4, due: NOW, seen: 5, correct: 4, avgMs: 1500, lastSeen: NOW },
    };
    expect(troubleFacts(p).map((t) => t.id)).toEqual(['mul:7:8', 'mul:6:7']);
  });
});
