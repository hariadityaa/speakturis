import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeNumber, composePrice, formatPrice } from './numbers';
import type { Numbers, PackMeta } from './types';

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(`../../content/ja/${f}`, import.meta.url), 'utf8')) as T;
const data = read<Numbers>('numbers.json');
const meta = read<PackMeta>('pack.json');

describe('composeNumber (ja)', () => {
  const cases: [number, string, string][] = [
    [0, 'zero', 'ゼロ'],
    [7, 'nana', '七'],
    [10, 'juu', '十'],
    [11, 'juu ichi', '十一'],
    [20, 'nijuu', '二十'],
    [100, 'hyaku', '百'],
    [300, 'sanbyaku', '三百'],
    [600, 'roppyaku', '六百'],
    [800, 'happyaku', '八百'],
    [1000, 'sen', '千'],
    [1280, 'sen nihyaku hachijuu', '千二百八十'],
    [3000, 'sanzen', '三千'],
    [8000, 'hassen', '八千'],
    [9999, 'kyuusen kyuuhyaku kyuujuu kyuu', '九千九百九十九'],
    [10000, 'ichiman', '一万'],
  ];
  it.each(cases)('%i', (n, reading, native) => {
    const w = composeNumber(n, data);
    expect(w.reading).toBe(reading);
    expect(w.native).toBe(native);
  });

  it('composes every number in range', () => {
    for (let n = data.range.min; n <= data.range.max; n++) expect(() => composeNumber(n, data)).not.toThrow();
  });

  it('adds the currency unit to prices', () => {
    expect(composePrice(1280, data, meta.currency.unit).reading).toBe('sen nihyaku hachijuu en');
    expect(composePrice(1280, data, meta.currency.unit).speak).toBe('せんにひゃくはちじゅうえん');
  });

  it('formats prices per pack currency', () => {
    expect(formatPrice(1280, meta.currency)).toBe('1,280円');
  });
});
