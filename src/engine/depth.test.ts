import { describe, expect, it } from 'vitest';
import { abilityOf, activeAbility, chargeNeeded } from './abilities';
import { bossFor, isBossGame } from './boss';
import { allDragons } from './dragons';
import { afterMatch, emptyLeague, LEAGUE, shotClockMs, slowSaveChance } from './league';
import { bumpQuest, emptyQuests, questsFor, QUESTS_PER_DAY } from './quests';
import { buy, emptyShop, ITEMS, toggleEquip, balance } from './shop';
import { Progress } from './scheduler';

const NOW = new Date(2026, 10, 3, 12).getTime();

describe('league', () => {
  it('moves up on a win and stays on a loss', () => {
    expect(afterMatch(emptyLeague(), false)).toEqual({ level: 0, trophies: 0 });
    expect(afterMatch(emptyLeague(), true)).toEqual({ level: 1, trophies: 0 });
  });
  it('gives a trophy for beating the top team and starts a new season', () => {
    expect(afterMatch({ level: LEAGUE.length - 1, trophies: 0 }, true)).toEqual({ level: 0, trophies: 1 });
  });
  it('gets harder up the ladder', () => {
    expect(slowSaveChance(0)).toBe(0);
    expect(slowSaveChance(7)).toBeGreaterThan(slowSaveChance(3));
    expect(shotClockMs(3000, 0)).toBe(5000);
    expect(shotClockMs(3000, 7)).toBeLessThan(shotClockMs(3000, 3));
    expect(shotClockMs(3000, 7)).toBeGreaterThanOrEqual(3600);
  });
});

describe('quests', () => {
  it('picks the same quests all day, different for siblings', () => {
    const a = questsFor('2026-11-03', 'Ava').map((q) => q.id);
    expect(a).toHaveLength(QUESTS_PER_DAY);
    expect(questsFor('2026-11-03', 'Ava').map((q) => q.id)).toEqual(a);
    const others = ['Ben', 'Cal', 'Dee', 'Eli'].map((n) => questsFor('2026-11-03', n).map((q) => q.id).join());
    expect(others.some((o) => o !== a.join())).toBe(true);
  });
  it('finishes a quest once when its count is reached, and resets the next day', () => {
    const quest = questsFor('2026-11-03', 'Ava')[0];
    let { state, finished } = bumpQuest(emptyQuests(), 'Ava', quest.key, quest.target - 1, NOW);
    expect(finished).toEqual([]);
    ({ state, finished } = bumpQuest(state, 'Ava', quest.key, 1, NOW));
    expect(finished.map((q) => q.id)).toContain(quest.id);
    ({ state, finished } = bumpQuest(state, 'Ava', quest.key, 5, NOW));
    expect(finished.map((q) => q.id)).not.toContain(quest.id);
    const tomorrow = bumpQuest(state, 'Ava', 'games', 1, NOW + 86400000).state;
    expect(tomorrow.done).toEqual([]);
    expect(tomorrow.counts).toEqual({ games: 1 });
  });
});

describe('shop', () => {
  const hat = ITEMS.find((i) => i.id === 'hat-cap')!;
  it('buys and wears an item when there are enough snacks', () => {
    expect(buy(emptyShop(), hat, hat.price - 1)).toBeNull();
    const shop = buy(emptyShop(), hat, 100)!;
    expect(shop.owned).toContain(hat.id);
    expect(shop.equipped.hat).toBe(hat.id);
    expect(balance(100, shop)).toBe(100 - hat.price);
    expect(buy(shop, hat, 1000)).toBeNull(); // already owned
    expect(toggleEquip(shop, hat).equipped.hat).toBeUndefined();
  });
  it('never sells trophy items', () => {
    const gold = ITEMS.find((i) => i.trophy)!;
    expect(buy(emptyShop(), gold, 10000)).toBeNull();
  });
});

function knownTable(table: number, box: number): Progress {
  const p: Progress = {};
  for (let b = 1; b <= 12; b++) {
    p[`mul:${table}:${b}`] = { box, due: NOW, seen: 3, correct: 3, avgMs: 1500, lastSeen: NOW };
    p[`mul:${b}:${table}`] = { box, due: NOW, seen: 3, correct: 3, avgMs: 1500, lastSeen: NOW };
    p[`div:${table}:${b}`] = { box, due: NOW, seen: 3, correct: 3, avgMs: 1500, lastSeen: NOW };
  }
  return p;
}

describe('dragon powers', () => {
  it('only work once the dragon hatches', () => {
    const egg = allDragons({ 'mul:7:3': { box: 1, due: NOW, seen: 1, correct: 0, avgMs: 4000, lastSeen: NOW } })[6];
    expect(egg.stage).toBe('egg');
    expect(activeAbility(egg)).toBeUndefined();
    const hatched = allDragons(knownTable(2, 3))[1];
    expect(activeAbility(hatched)).toBe(abilityOf(2));
  });
  it('Spark charges the meter faster', () => {
    expect(chargeNeeded('spark')).toBe(2);
    expect(chargeNeeded(undefined)).toBe(3);
  });
});

describe('boss rounds', () => {
  it('come every 5th game', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(isBossGame)).toEqual([false, false, false, false, true, false, true]);
  });
  it('use trouble facts, and skip the boss when there are too few', () => {
    expect(bossFor({}, false)).toBeUndefined();
    const p: Progress = {};
    for (const id of ['mul:7:8', 'mul:6:7', 'mul:8:6', 'mul:12:7', 'mul:9:8', 'mul:7:7']) p[id] = { box: 1, due: NOW, seen: 4, correct: 1, avgMs: 5000, lastSeen: NOW };
    const boss = bossFor(p, true)!;
    expect(boss.facts).toHaveLength(5);
    expect(boss.name).toContain('King');
  });
});
