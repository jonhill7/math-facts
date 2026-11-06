import { Fact } from './facts';
import { strategyFor } from './hints';

// A picture hint: the fact drawn as rows of dots (an array), split into
// colored chunks that match the strategy hint. 6 × 8 shows as 6 rows of 8,
// split into 5 rows (5 × 8 = 40) and 1 more row (8), so the kid sees why
// 40 + 8 = 48 instead of just reading it.

export type Tone = 'a' | 'b' | 'plain' | 'gone';

export interface Band {
  rows: number; // rows of dots in this chunk
  tone: Tone; // 'gone' = dots crossed out (the take-away row for times 9)
  label: string; // shown beside the chunk, e.g. "5 × 8 = 40"
}

export interface Picture {
  cols: number; // dots in every row
  bands: Band[]; // top to bottom; their rows add up to the whole picture
  sum: string; // the line under the picture, e.g. "40 + 8 = 48"
  columns?: boolean; // skip counting: each band is a standing column of dots, side by side
}

const split = (n: number, parts: [number, string][], sum: string): Picture => ({
  cols: n,
  bands: parts.map(([rows, label], i) => ({ rows, tone: i % 2 === 0 ? 'a' : 'b', label })),
  sum,
});

// Count by 5s or 10s: one column of dots per step, labeled with the running total.
const skip = (step: number, n: number): Picture => ({
  cols: step,
  columns: true,
  bands: Array.from({ length: n }, (_, i) => ({ rows: 1, tone: i % 2 === 0 ? 'a' : 'b', label: `${step * (i + 1)}` })),
  sum: `${n} ${step === 5 ? 'fives' : 'tens'} make ${n * step}`,
});

function multiply(t: number, n: number): Picture {
  switch (t) {
    case 1:
      return split(n, [[1, `${n}`]], `1 row of ${n} is ${n}`);
    case 2:
      return split(n, [[1, `${n}`], [1, `${n}`]], `${n} + ${n} = ${2 * n}`);
    case 3:
      return split(n, [[2, `2 × ${n} = ${2 * n}`], [1, `${n}`]], `${2 * n} + ${n} = ${3 * n}`);
    case 4:
      return split(n, [[2, `2 × ${n} = ${2 * n}`], [2, `2 × ${n} = ${2 * n}`]], `${2 * n} + ${2 * n} = ${4 * n}`);
    case 5:
      return skip(5, n);
    case 6:
      return split(n, [[5, `5 × ${n} = ${5 * n}`], [1, `${n}`]], `${5 * n} + ${n} = ${6 * n}`);
    case 7:
      return split(n, [[5, `5 × ${n} = ${5 * n}`], [2, `2 × ${n} = ${2 * n}`]], `${5 * n} + ${2 * n} = ${7 * n}`);
    case 8:
      return split(n, [[4, `4 × ${n} = ${4 * n}`], [4, `4 × ${n} = ${4 * n}`]], `${4 * n} + ${4 * n} = ${8 * n}`);
    case 9:
      return {
        cols: n,
        bands: [
          { rows: 9, tone: 'a', label: `9 × ${n}` },
          { rows: 1, tone: 'gone', label: `take away ${n}` },
        ],
        sum: `${10 * n} − ${n} = ${9 * n}`,
      };
    case 10:
      return skip(10, n);
    case 11:
      return split(n, [[10, `10 × ${n} = ${10 * n}`], [1, `${n}`]], `${10 * n} + ${n} = ${11 * n}`);
    default: // 12
      return split(n, [[10, `10 × ${n} = ${10 * n}`], [2, `2 × ${n} = ${2 * n}`]], `${10 * n} + ${2 * n} = ${12 * n}`);
  }
}

// Division: share the dots into equal rows and look at one row.
// 56 ÷ 7 is 56 dots in 7 rows, and each row has 8.
function divide(a: number, b: number): Picture {
  const bands: Band[] = [{ rows: 1, tone: 'a', label: `${b} in each row` }];
  if (a > 1) bands.push({ rows: a - 1, tone: 'plain', label: '' });
  return { cols: b, bands, sum: `${a * b} shared into ${a} rows → ${b} in each` };
}

export function pictureFor(fact: Fact): Picture {
  const { table, other } = strategyFor(fact);
  return fact.op === 'div' ? divide(fact.a, fact.b) : multiply(table, other);
}

export const pictureRows = (p: Picture) => p.bands.reduce((n, b) => n + b.rows, 0);
