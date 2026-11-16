import { Fact } from './facts';

// Short strategy hints shown after a miss. Strategies beat rote memorizing:
// they give the kid a quick way to rebuild a fact they forget.
// Each hint takes the other factor n, and r: the result as shown. Help before
// answering shows r as "?" so the kid finishes the last step themselves.
type Hint = (n: number, r: string) => string;
const TABLE_HINTS: Record<number, Hint> = {
  1: (n, r) => `Anything times 1 stays the same: 1 × ${n} = ${r}.`,
  2: (n, r) => `Times 2 is a double: ${n} + ${n} = ${r}.`,
  3: (n, r) => `Times 3 is a double plus one more ${n}: ${2 * n} + ${n} = ${r}.`,
  4: (n, r) => `Times 4 is double, then double again: ${n} → ${2 * n} → ${r}.`,
  5: (n, r) => `Times 5 is counting by 5s: ${skipCount(5, n, r)}.`,
  6: (n, r) => `Times 6 is times 5 plus one more ${n}: ${5 * n} + ${n} = ${r}.`,
  7: (n, r) => `Times 7 is times 5 plus times 2: ${5 * n} + ${2 * n} = ${r}.`,
  8: (n, r) => `Times 8 is times 4, twice: ${4 * n} + ${4 * n} = ${r}.`,
  9: (n, r) => `Times 9 is times 10 minus one ${n}: ${10 * n} − ${n} = ${r}.`,
  10: (n, r) => `Times 10 turns ${n} ones into ${n} tens: ${n} tens = ${r}.`,
  11: (n, r) => `Times 11 is times 10 plus one more ${n}: ${10 * n} + ${n} = ${r}.`,
  12: (n, r) => `Times 12 is times 10 plus times 2: ${10 * n} + ${2 * n} = ${r}.`,
};

// "5, 10, 15 … 40": short enough to read, long enough to show the pattern.
// With the answer hidden, the count stops one step short: "5, 10, 15 … 35, ?".
function skipCount(step: number, n: number, r: string): string {
  const all: string[] = Array.from({ length: n }, (_, i) => String(step * (i + 1)));
  all[all.length - 1] = r;
  if (r === '?' && n > 4) return `${all.slice(0, 3).join(', ')} … ${step * (n - 1)}, ?`;
  return all.length <= 4 ? all.join(', ') : `${all.slice(0, 3).join(', ')} … ${all[all.length - 1]}`;
}

// Which factor's strategy to use: whichever table has the easier trick.
// The picture hint uses the same choice so the words and the dots match.
const EASY = [1, 2, 10, 5, 11, 4, 9, 3, 6, 8, 7, 12];
export function strategyFor(fact: Fact): { table: number; other: number } {
  if (fact.op === 'div') return { table: fact.a, other: fact.b };
  const table = EASY.indexOf(fact.a) <= EASY.indexOf(fact.b) ? fact.a : fact.b;
  return { table, other: table === fact.a ? fact.b : fact.a };
}

// The strategy hint. hideAnswer leaves the last step for the kid: it's the
// help they can ask for before answering.
export function hintFor(fact: Fact, hideAnswer = false): string {
  const { table, other } = strategyFor(fact);
  const product = fact.a * fact.b;
  if (fact.op === 'div') {
    const ask = `Think multiplication: ${fact.a} × ? = ${product}.`;
    return hideAnswer ? `${ask} Count by ${fact.a}s until you reach ${product}.` : `${ask} ${TABLE_HINTS[table](other, String(product))}`;
  }
  return TABLE_HINTS[table](other, hideAnswer ? '?' : String(product)).replace('?.', '?');
}

// The four facts that belong together: 7 × 8, 8 × 7, 56 ÷ 7 and 56 ÷ 8.
export function factFamily(fact: Fact): string[] {
  const { a, b } = fact;
  const p = a * b;
  const all = [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`];
  return [...new Set(all)];
}
