import { describe, expect, it } from 'vitest';
import { Ability, ABILITY_INFO, abilityOf, activeAbility, activePower, chargeNeeded, freeClues, keepsCharge, Power, PowerLevel, powerLevelFor, powerSize, shieldsFor, slowSaveFactor, snackBonus, startCharge } from './abilities';
import { bossFor, isBossGame } from './boss';
import { companionFor, dragonState, feed, snacksForLevel, SPECIES, speciesById } from './dragons';
import { afterMatch, emptyLeague, LEAGUE, shotClockMs, slowSaveChance } from './league';
import { bumpQuest, emptyQuests, questsFor, QUESTS_PER_DAY } from './quests';
import { buy, emptyShop, hatOf, ITEMS, owns, splitHats, toggleEquip, balance } from './shop';
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
    expect(slowSaveChance(LEAGUE.length - 1)).toBe(0.42);
    expect(shotClockMs(3000, 0)).toBe(5000);
    expect(shotClockMs(3000, 7)).toBeLessThan(shotClockMs(3000, 3));
    expect(shotClockMs(3000, LEAGUE.length - 1)).toBe(3600);
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
    const shop = buy(emptyShop(), hat, 100, 7)!;
    expect(owns(shop, hat, 0, 7)).toBe(true);
    expect(hatOf(shop, 7)).toBe(hat.icon);
    expect(balance(100, shop)).toBe(100 - hat.price);
    expect(buy(shop, hat, 1000, 7)).toBeNull(); // already owned
    expect(hatOf(toggleEquip(shop, hat, 7), 7)).toBeUndefined();
  });
  it('gives each dragon its own hats', () => {
    const shop = buy(emptyShop(), hat, 1000, 7)!;
    expect(owns(shop, hat, 0, 2)).toBe(false);
    expect(hatOf(shop, 2)).toBeUndefined();
    const both = buy(shop, hat, 1000, 2)!;
    expect(both.spent).toBe(hat.price * 2);
    expect(hatOf(toggleEquip(both, hat, 2), 7)).toBe(hat.icon); // taking one off leaves the other
  });
  it('keeps hats from older saves for every dragon found so far', () => {
    const red = ITEMS.find((i) => i.id === 'gloves-red')!;
    const old = { ...emptyShop(), owned: [hat.id, red.id], equipped: { hat: hat.id, gloves: red.id } };
    const shop = splitHats(old, [7, 2], 2);
    expect(owns(shop, hat, 0, 7) && owns(shop, hat, 0, 2)).toBe(true);
    expect(owns(shop, hat, 0, 8)).toBe(false); // a dragon not found yet buys its own
    expect(hatOf(shop, 2)).toBe(hat.icon);
    expect(hatOf(shop, 7)).toBeUndefined();
    expect(owns(shop, red, 0)).toBe(true);
    expect(shop.equipped.gloves).toBe(red.id);
  });
  it('never sells trophy items', () => {
    const gold = ITEMS.find((i) => i.trophy)!;
    expect(buy(emptyShop(), gold, 10000)).toBeNull();
  });
});

describe('dragon powers', () => {
  it('only work once the dragon hatches', () => {
    const egg = companionFor({}, 0);
    expect(egg.stage).toBe('egg');
    expect(activeAbility(egg)).toBeUndefined();
    const hatched = companionFor(feed({}, egg.species.id, 36), 36);
    expect(activeAbility(hatched)).toBe(abilityOf(egg.species.id));
  });
  it('are different for every dragon', () => {
    const powers = SPECIES.map((s) => abilityOf(s.id));
    expect(new Set(powers).size).toBe(SPECIES.length);
    expect(Object.keys(ABILITY_INFO)).toHaveLength(SPECIES.length);
  });
  it('change the game numbers', () => {
    const at = (ability: Ability, level: PowerLevel): Power => ({ ability, level });
    expect(chargeNeeded(undefined)).toBe(3);
    expect([1, 2, 3].map((l) => chargeNeeded(at('tailwind', l as PowerLevel)))).toEqual([3, 2, 2]);
    expect([1, 2, 3].map((l) => startCharge(at('headStart', l as PowerLevel)))).toEqual([1, 2, 2]);
    expect([1, 2, 3].map((l) => powerSize(at('blaze', l as PowerLevel)))).toEqual([3, 3, 4]);
    expect(powerSize(undefined)).toBe(2);
    expect([1, 2, 3].map((l) => snackBonus(at('feast', l as PowerLevel), false))).toEqual([0, 1, 2]);
    expect(snackBonus(at('feast', 1), true)).toBe(1);
    expect([1, 2, 3].map((l) => shieldsFor(at('shield', l as PowerLevel), false))).toEqual([1, 2, 3]);
    expect(shieldsFor(at('spiky', 3), true)).toBe(1);
    expect(shieldsFor(at('spiky', 3), false)).toBe(0);
    expect([1, 2, 3].map((l) => slowSaveFactor(at('spiky', l as PowerLevel)))).toEqual([0.5, 0, 0]);
    expect(keepsCharge(at('tailwind', 1), true)).toBe(true);
    expect(keepsCharge(at('tailwind', 2), true)).toBe(false);
    expect(keepsCharge(at('tailwind', 3), false)).toBe(true);
    expect(freeClues(at('nightVision', 1), 0)).toBe(1);
    expect(freeClues(at('nightVision', 1), 1)).toBe(0);
    expect(freeClues(at('nightVision', 3), 4)).toBe(2);
  });
  it('get stronger as the dragon ranks up, and level II matches the old powers', () => {
    expect([1, 3, 19, 20, 29, 30].map(powerLevelFor)).toEqual([0, 1, 1, 2, 2, 3]);
    const id = 7; // Ember Drake: Blaze
    expect(activePower(dragonState(speciesById(id), { [id]: snacksForLevel(20) }, true))).toEqual({ ability: 'blaze', level: 2 });
    expect(activePower(dragonState(speciesById(id), { [id]: snacksForLevel(30) }, true))?.level).toBe(3);
    for (const a of Object.keys(ABILITY_INFO) as Ability[]) expect(new Set(ABILITY_INFO[a].levels).size).toBe(3);
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
