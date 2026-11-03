import { Fact } from './facts';

// Short strategy hints shown after a miss. Strategies beat rote memorizing:
// they give the kid a quick way to rebuild a fact they forget.
const TABLE_HINTS: Record<number, (n: number) => string> = {
  1: (n) => `Anything times 1 stays the same: 1 × ${n} = ${n}.`,
  2: (n) => `Times 2 is a double: ${n} + ${n} = ${2 * n}.`,
  3: (n) => `Times 3 is a double plus one more: ${2 * n} + ${n} = ${3 * n}.`,
  4: (n) => `Times 4 is double, then double again: ${n} → ${2 * n} → ${4 * n}.`,
  5: (n) => `Times 5 is half of times 10: half of ${10 * n} is ${5 * n}.`,
  6: (n) => `Times 6 is times 5 plus one more: ${5 * n} + ${n} = ${6 * n}.`,
  7: (n) => `Times 7 is times 5 plus times 2: ${5 * n} + ${2 * n} = ${7 * n}.`,
  8: (n) => `Times 8 is double three times: ${n} → ${2 * n} → ${4 * n} → ${8 * n}.`,
  9: (n) => `Times 9 is times 10 minus one: ${10 * n} − ${n} = ${9 * n}.`,
  10: (n) => `Times 10 puts a zero on the end: ${n} → ${10 * n}.`,
  11: (n) => `Times 11 is times 10 plus one more: ${10 * n} + ${n} = ${11 * n}.`,
  12: (n) => `Times 12 is times 10 plus times 2: ${10 * n} + ${2 * n} = ${12 * n}.`,
};

export function hintFor(fact: Fact): string {
  if (fact.op === 'div') {
    return `Think multiplication: ${fact.a} × ? = ${fact.a * fact.b}. ${TABLE_HINTS[fact.a](fact.b)}`;
  }
  // Use whichever factor gives the easier strategy.
  const easy = [1, 2, 10, 5, 11, 4, 9, 3, 6, 8, 7, 12];
  const table = easy.indexOf(fact.a) <= easy.indexOf(fact.b) ? fact.a : fact.b;
  const other = table === fact.a ? fact.b : fact.a;
  return TABLE_HINTS[table](other);
}
