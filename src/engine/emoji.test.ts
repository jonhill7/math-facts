import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Emoji from 2020 on (Emoji 13 and later) show up as empty boxes on Windows 10
// and older phones and tablets. Stick to Emoji 12 or older everywhere.
const OLD_IN_NEW_BLOCK = new Set([0x1fa70, 0x1fa71, 0x1fa72, 0x1fa73, 0x1fa78, 0x1fa79, 0x1fa7a, 0x1fa80, 0x1fa81, 0x1fa82, 0x1fa90, 0x1fa91, 0x1fa92, 0x1fa93, 0x1fa94, 0x1fa95]);
const NEW_ELSEWHERE = [
  [0x1f6d6, 0x1f6d7], [0x1f6dc, 0x1f6df], [0x1f6fb, 0x1f6fc], [0x1f7f0, 0x1f7f0], [0x1f90c, 0x1f90c], [0x1f972, 0x1f972],
  [0x1f977, 0x1f979], [0x1f9a3, 0x1f9a4], [0x1f9ab, 0x1f9ad], [0x1f9cb, 0x1f9cc],
];

export function tooNew(cp: number): boolean {
  if (cp >= 0x1fa70 && cp <= 0x1faff) return !OLD_IN_NEW_BLOCK.has(cp);
  return NEW_ELSEWHERE.some(([a, b]) => cp >= a && cp <= b);
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css|html)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('emoji', () => {
  it('knows which emoji are too new', () => {
    expect(tooNew('🩷'.codePointAt(0)!)).toBe(true);
    expect(tooNew('🫐'.codePointAt(0)!)).toBe(true);
    expect(tooNew('🪑'.codePointAt(0)!)).toBe(false);
    expect(tooNew('🧤'.codePointAt(0)!)).toBe(false);
  });

  it('only uses emoji that every device can draw', () => {
    const found: string[] = [];
    for (const path of [...files('src'), 'index.html']) {
      for (const ch of readFileSync(path, 'utf8')) {
        if (tooNew(ch.codePointAt(0)!)) found.push(`${ch} in ${path}`);
      }
    }
    expect(found).toEqual([]);
  });
});
