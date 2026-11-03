// All the facts the app knows about: multiplication and division up to 12 x 12.

export type Op = 'mul' | 'div';

export interface Fact {
  id: string; // "mul:7:8" means 7 x 8; "div:7:8" means 56 / 7 (answer 8)
  op: Op;
  a: number;
  b: number;
  answer: number;
  text: string; // what the kid sees, e.g. "7 × 8"
}

export const MAX_FACTOR = 12;

// The order tables are introduced in: easy patterns first, hardest last.
export const TABLE_ORDER = [1, 2, 10, 5, 11, 3, 4, 9, 6, 8, 7, 12];

export function makeFact(op: Op, a: number, b: number): Fact {
  if (op === 'mul') {
    return { id: `mul:${a}:${b}`, op, a, b, answer: a * b, text: `${a} × ${b}` };
  }
  return { id: `div:${a}:${b}`, op, a, b, answer: b, text: `${a * b} ÷ ${a}` };
}

export const ALL_FACTS: Fact[] = (() => {
  const facts: Fact[] = [];
  for (const op of ['mul', 'div'] as Op[]) {
    for (let a = 1; a <= MAX_FACTOR; a++) {
      for (let b = 1; b <= MAX_FACTOR; b++) facts.push(makeFact(op, a, b));
    }
  }
  return facts;
})();

const BY_ID = new Map(ALL_FACTS.map((f) => [f.id, f]));

export function factById(id: string): Fact {
  const fact = BY_ID.get(id);
  if (!fact) throw new Error(`Unknown fact ${id}`);
  return fact;
}

const rank = (n: number) => TABLE_ORDER.indexOf(n);

// Lower number = introduce sooner. A fact is as easy as its easiest factor
// (2 x 7 is easy because of the 2s), then by its other factor.
export function difficulty(fact: Fact): number {
  if (fact.op === 'div') {
    // Division is learned table by table, by the divisor.
    return 1000 + rank(fact.a) * 100 + rank(fact.b);
  }
  const lo = Math.min(rank(fact.a), rank(fact.b));
  const hi = Math.max(rank(fact.a), rank(fact.b));
  return lo * 100 + hi;
}
