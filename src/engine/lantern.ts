// Lantern Hunt rules that don't need React, so they can be tested.

export type Clue = 'hot' | 'warm' | 'cold';

// Steps between two spots in a size × size house (no diagonals).
export const spotDistance = (size: number, a: number, b: number) =>
  Math.abs((a % size) - (b % size)) + Math.abs(Math.floor(a / size) - Math.floor(b / size));

export const clueAt = (size: number, spot: number, monster: number): Clue => {
  const d = spotDistance(size, spot, monster);
  return d === 1 ? 'hot' : d === 2 ? 'warm' : 'cold';
};

// Night Vision: a free clue at the start of each hunt. It is always warm or
// cold, never hot, so it narrows the search without pointing right at the
// monster. The kid still has to answer fast to get the clues that find it.
// Several free clues at different spots, for Night Vision II and III.
export function freeClues(size: number, monster: number, count: number, random = Math.random): { spot: number; clue: Clue }[] {
  const far = Array.from({ length: size * size }, (_, i) => i).filter((i) => spotDistance(size, i, monster) >= 2);
  const out: { spot: number; clue: Clue }[] = [];
  while (out.length < count && far.length) {
    const spot = far.splice(Math.floor(random() * far.length), 1)[0];
    out.push({ spot, clue: clueAt(size, spot, monster) });
  }
  return out;
}

export function nightVisionClue(size: number, monster: number, random = Math.random): { spot: number; clue: Clue } {
  const far = Array.from({ length: size * size }, (_, i) => i).filter((i) => spotDistance(size, i, monster) >= 2);
  const spot = far[Math.floor(random() * far.length)];
  return { spot, clue: clueAt(size, spot, monster) };
}
