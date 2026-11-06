// The snack shop. Snacks the dragon has eaten can also be spent on gear.
// Spending never shrinks the dragon: levels count every snack ever eaten.
// Hats belong to one dragon: each dragon has its own hats and wears its own
// in the meadow, so dressing up the whole hatchery is a long goal. Gloves,
// ball trails and lantern colors are the kid's gear and work for everyone.

export type Slot = 'gloves' | 'ball' | 'lantern' | 'hat' | 'meadow';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  icon: string;
  price: number;
  trophy?: boolean; // unlocked by winning the league instead of buying
  desc?: string; // what it does, for things that change how dragons behave
}

export const SLOT_NAMES: Record<Slot, string> = {
  hat: 'Dragon hats',
  gloves: 'Keeper gloves',
  ball: 'Ball trails',
  lantern: 'Lantern colors',
  meadow: 'Hatchery meadow',
};

// Cheapest first in each slot. Everything together costs about 6,500 snacks,
// a few months of practice, and the fanciest things are big goals to save for.
export const ITEMS: Item[] = [
  { id: 'hat-flower', slot: 'hat', name: 'Flower', icon: '🌸', price: 60 },
  { id: 'hat-cap', slot: 'hat', name: 'Cap', icon: '🧢', price: 80 },
  { id: 'hat-bow', slot: 'hat', name: 'Bow', icon: '🎀', price: 80 },
  { id: 'hat-sunflower', slot: 'hat', name: 'Sunflower', icon: '🌻', price: 80 },
  { id: 'hat-feather', slot: 'hat', name: 'Feather', icon: '🪶', price: 100 },
  { id: 'hat-tophat', slot: 'hat', name: 'Top hat', icon: '🎩', price: 120 },
  { id: 'hat-chick', slot: 'hat', name: 'Chick buddy', icon: '🐣', price: 180 },
  { id: 'hat-pumpkin', slot: 'hat', name: 'Pumpkin', icon: '🎃', price: 200 },
  { id: 'hat-sunhat', slot: 'hat', name: 'Sun hat', icon: '👒', price: 250 },
  { id: 'hat-grad', slot: 'hat', name: 'Graduation cap', icon: '🎓', price: 400 },
  { id: 'hat-crown', slot: 'hat', name: 'Royal crown', icon: '👑', price: 1000 },
  { id: 'gloves-red', slot: 'gloves', name: 'Red gloves', icon: '🧤', price: 100 },
  { id: 'gloves-purple', slot: 'gloves', name: 'Purple gloves', icon: '🧤', price: 100 },
  { id: 'gloves-ice', slot: 'gloves', name: 'Ice gloves', icon: '🧤', price: 200 },
  { id: 'gloves-shadow', slot: 'gloves', name: 'Shadow gloves', icon: '🧤', price: 400 },
  { id: 'gloves-gold', slot: 'gloves', name: 'Champion gloves', icon: '🧤', price: 0, trophy: true },
  { id: 'ball-fire', slot: 'ball', name: 'Fire trail', icon: '🔥', price: 160 },
  { id: 'ball-ice', slot: 'ball', name: 'Ice trail', icon: '❄️', price: 160 },
  { id: 'ball-star', slot: 'ball', name: 'Star trail', icon: '⭐', price: 240 },
  { id: 'ball-lightning', slot: 'ball', name: 'Lightning trail', icon: '⚡', price: 500 },
  { id: 'ball-ghost', slot: 'ball', name: 'Ghost trail', icon: '👻', price: 300 },
  { id: 'ball-rainbow', slot: 'ball', name: 'Rainbow trail', icon: '🌈', price: 900 },
  { id: 'lantern-blue', slot: 'lantern', name: 'Blue beam', icon: '🔵', price: 120 },
  { id: 'lantern-green', slot: 'lantern', name: 'Green beam', icon: '🟢', price: 120 },
  { id: 'lantern-pink', slot: 'lantern', name: 'Pink beam', icon: '🩷', price: 120 },
  { id: 'lantern-purple', slot: 'lantern', name: 'Purple beam', icon: '🟣', price: 250 },
  { id: 'lantern-red', slot: 'lantern', name: 'Red beam', icon: '🔴', price: 250 },
  { id: 'lantern-gold', slot: 'lantern', name: 'Gold beam', icon: '🟡', price: 400 },
  // Things for the hatchery meadow. Unlike gear, you can have all of them out at once.
  { id: 'meadow-berries', slot: 'meadow', name: 'Berry bush', icon: '🫐', price: 100, desc: 'Hungry dragons stop by for a munch.' },
  { id: 'meadow-cloud', slot: 'meadow', name: 'Cloud bed', icon: '☁️', price: 140, desc: 'Sleepy dragons curl up on it for long naps together.' },
  { id: 'meadow-pond', slot: 'meadow', name: 'Splash pond', icon: '💦', price: 160, desc: 'Dragons splash about. Octofrost makes ice!' },
  { id: 'meadow-campfire', slot: 'meadow', name: 'Campfire', icon: '🔥', price: 180, desc: 'Lights up the night. Dragons stay up to gather round it.' },
  { id: 'meadow-trampoline', slot: 'meadow', name: 'Trampoline', icon: '🤸', price: 220, desc: 'One dragon at a time bounces sky high.' },
  { id: 'meadow-drum', slot: 'meadow', name: 'Party drum', icon: '🥁', price: 260, desc: 'Tap it and every awake dragon starts dancing.' },
];

export interface ShopState {
  owned: string[]; // gear and meadow things (and, in older saves, hats)
  equipped: Partial<Record<Slot, string>>; // gear in use (hats are in `worn`)
  placed: string[]; // meadow things out in the hatchery (any number at once)
  spent: number;
  hats: Record<string, string[]>; // hats each dragon owns, by species id
  worn: Record<string, string>; // the hat each dragon has on, by species id
}

export const emptyShop = (): ShopState => ({ owned: [], equipped: {}, placed: [], spent: 0, hats: {}, worn: {} });

const hatsOf = (shop: ShopState, dragon: number) => shop.hats[String(dragon)] ?? [];

// The hat a dragon has on, as its icon.
export const hatOf = (shop: ShopState, dragon: number) => itemById(shop.worn[String(dragon)])?.icon;

// Whether an item is in use: worn gear (a hat on this dragon), or a meadow thing that's out.
export function isOn(shop: ShopState, item: Item, dragon = 0): boolean {
  if (item.slot === 'meadow') return shop.placed.includes(item.id);
  if (item.slot === 'hat') return shop.worn[String(dragon)] === item.id;
  return shop.equipped[item.slot] === item.id;
}

export const balance = (snacks: number, shop: ShopState) => snacks - shop.spent;

export function itemById(id: string | undefined): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

// Hats are owned by one dragon; everything else by the kid.
export function owns(shop: ShopState, item: Item, trophies: number, dragon = 0): boolean {
  if (item.trophy) return trophies > 0;
  return item.slot === 'hat' ? hatsOf(shop, dragon).includes(item.id) : shop.owned.includes(item.id);
}

export function buy(shop: ShopState, item: Item, snacks: number, dragon = 0): ShopState | null {
  if (item.trophy || owns(shop, item, 0, dragon) || balance(snacks, shop) < item.price) return null;
  const spent = shop.spent + item.price;
  if (item.slot === 'hat') {
    const key = String(dragon);
    return { ...shop, spent, hats: { ...shop.hats, [key]: [...hatsOf(shop, dragon), item.id] }, worn: { ...shop.worn, [key]: item.id } };
  }
  const owned = [...shop.owned, item.id];
  if (item.slot === 'meadow') return { ...shop, owned, placed: [...shop.placed, item.id], spent };
  return { ...shop, owned, equipped: { ...shop.equipped, [item.slot]: item.id }, spent };
}

// Tap an equipped item to take it off again (or put a meadow thing away).
export function toggleEquip(shop: ShopState, item: Item, dragon = 0): ShopState {
  const on = isOn(shop, item, dragon);
  if (item.slot === 'meadow') return { ...shop, placed: on ? shop.placed.filter((id) => id !== item.id) : [...shop.placed, item.id] };
  if (item.slot === 'hat') {
    const worn = { ...shop.worn };
    if (on) delete worn[String(dragon)];
    else worn[String(dragon)] = item.id;
    return { ...shop, worn };
  }
  return { ...shop, equipped: { ...shop.equipped, [item.slot]: on ? undefined : item.id } };
}

// Saves from before hats were per dragon shared one set of hats. Every dragon
// found so far keeps all of them, and the companion keeps wearing its hat.
export function splitHats(shop: ShopState, found: number[], companion: number): ShopState {
  const old = shop.owned.filter((id) => itemById(id)?.slot === 'hat');
  const hats: Record<string, string[]> = { ...shop.hats };
  if (old.length) for (const id of found) hats[String(id)] = [...new Set([...(hats[String(id)] ?? []), ...old])];
  const worn = { ...shop.worn };
  if (shop.equipped.hat) worn[String(companion)] = shop.equipped.hat;
  return { ...shop, owned: shop.owned.filter((id) => !old.includes(id)), equipped: { ...shop.equipped, hat: undefined }, hats, worn };
}

// How the gear looks in the games.
export const GLOVE_FILTER: Record<string, string> = {
  'gloves-red': 'hue-rotate(150deg) saturate(2.2)',
  'gloves-purple': 'hue-rotate(60deg) saturate(1.8)',
  'gloves-gold': 'sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.15)',
  'gloves-shadow': 'grayscale(1) brightness(0.45) contrast(1.3)',
  'gloves-ice': 'hue-rotate(-60deg) saturate(0.6) brightness(1.35)',
};

export const BALL_GLOW: Record<string, string> = {
  'ball-fire': 'drop-shadow(0 0 6px #f97316) drop-shadow(0 0 12px #ef4444)',
  'ball-ice': 'drop-shadow(0 0 6px #7dd3fc) drop-shadow(0 0 12px #38bdf8)',
  'ball-star': 'drop-shadow(0 0 6px #fde047) drop-shadow(0 0 14px #facc15)',
  'ball-lightning': 'drop-shadow(0 0 5px #fef08a) drop-shadow(0 0 10px #a78bfa) drop-shadow(0 0 16px #7c3aed)',
  'ball-ghost': 'opacity(0.75) drop-shadow(0 0 6px #e5e7eb) drop-shadow(0 0 14px #cbd5e1)',
  'ball-rainbow': 'drop-shadow(-4px 0 4px #ef4444) drop-shadow(0 -4px 4px #facc15) drop-shadow(4px 0 4px #22c55e) drop-shadow(0 4px 4px #3b82f6) drop-shadow(0 0 10px #a855f7)',
};

export const BEAM_RGB: Record<string, string> = {
  'lantern-blue': '125, 211, 252',
  'lantern-green': '134, 239, 172',
  'lantern-pink': '249, 168, 212',
  'lantern-purple': '196, 181, 253',
  'lantern-red': '252, 165, 165',
  'lantern-gold': '253, 224, 71',
};
export const DEFAULT_BEAM_RGB = '255, 214, 120';
