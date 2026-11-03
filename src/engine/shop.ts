// The snack shop. Snacks the dragon has eaten can also be spent on gear.
// Spending never shrinks the dragon: levels count every snack ever eaten.

export type Slot = 'gloves' | 'ball' | 'lantern' | 'hat';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  icon: string;
  price: number;
  trophy?: boolean; // unlocked by winning the league instead of buying
}

export const SLOT_NAMES: Record<Slot, string> = {
  hat: 'Dragon hats',
  gloves: 'Keeper gloves',
  ball: 'Ball trails',
  lantern: 'Lantern colors',
};

export const ITEMS: Item[] = [
  { id: 'hat-tophat', slot: 'hat', name: 'Top hat', icon: '🎩', price: 60 },
  { id: 'hat-cap', slot: 'hat', name: 'Cap', icon: '🧢', price: 40 },
  { id: 'hat-bow', slot: 'hat', name: 'Bow', icon: '🎀', price: 40 },
  { id: 'hat-flower', slot: 'hat', name: 'Flower', icon: '🌸', price: 30 },
  { id: 'gloves-red', slot: 'gloves', name: 'Red gloves', icon: '🧤', price: 50 },
  { id: 'gloves-purple', slot: 'gloves', name: 'Purple gloves', icon: '🧤', price: 50 },
  { id: 'gloves-gold', slot: 'gloves', name: 'Champion gloves', icon: '🧤', price: 0, trophy: true },
  { id: 'ball-fire', slot: 'ball', name: 'Fire trail', icon: '🔥', price: 80 },
  { id: 'ball-ice', slot: 'ball', name: 'Ice trail', icon: '❄️', price: 80 },
  { id: 'ball-star', slot: 'ball', name: 'Star trail', icon: '⭐', price: 120 },
  { id: 'lantern-blue', slot: 'lantern', name: 'Blue beam', icon: '🔵', price: 60 },
  { id: 'lantern-green', slot: 'lantern', name: 'Green beam', icon: '🟢', price: 60 },
  { id: 'lantern-pink', slot: 'lantern', name: 'Pink beam', icon: '🩷', price: 60 },
];

export interface ShopState {
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
  spent: number;
}

export const emptyShop = (): ShopState => ({ owned: [], equipped: {}, spent: 0 });

export const balance = (snacks: number, shop: ShopState) => snacks - shop.spent;

export function itemById(id: string | undefined): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function owns(shop: ShopState, item: Item, trophies: number): boolean {
  return item.trophy ? trophies > 0 : shop.owned.includes(item.id);
}

export function buy(shop: ShopState, item: Item, snacks: number): ShopState | null {
  if (item.trophy || shop.owned.includes(item.id) || balance(snacks, shop) < item.price) return null;
  return { owned: [...shop.owned, item.id], equipped: { ...shop.equipped, [item.slot]: item.id }, spent: shop.spent + item.price };
}

// Tap an equipped item to take it off again.
export function toggleEquip(shop: ShopState, item: Item): ShopState {
  const on = shop.equipped[item.slot] === item.id;
  return { ...shop, equipped: { ...shop.equipped, [item.slot]: on ? undefined : item.id } };
}

// How the gear looks in the games.
export const GLOVE_FILTER: Record<string, string> = {
  'gloves-red': 'hue-rotate(150deg) saturate(2.2)',
  'gloves-purple': 'hue-rotate(60deg) saturate(1.8)',
  'gloves-gold': 'sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.15)',
};

export const BALL_GLOW: Record<string, string> = {
  'ball-fire': 'drop-shadow(0 0 6px #f97316) drop-shadow(0 0 12px #ef4444)',
  'ball-ice': 'drop-shadow(0 0 6px #7dd3fc) drop-shadow(0 0 12px #38bdf8)',
  'ball-star': 'drop-shadow(0 0 6px #fde047) drop-shadow(0 0 14px #facc15)',
};

export const BEAM_RGB: Record<string, string> = {
  'lantern-blue': '125, 211, 252',
  'lantern-green': '134, 239, 172',
  'lantern-pink': '249, 168, 212',
};
export const DEFAULT_BEAM_RGB = '255, 214, 120';
