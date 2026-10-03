import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEARD, SURVIVAL, bookLists, bookPhrases } from './phrasebook';
import type { Pack } from './types';

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../content/ja/${f}.json`, import.meta.url), 'utf8'));
const pack = { meta: read('pack'), scripts: read('scripts'), phrases: read('phrases'), numbers: read('numbers'), dialogues: read('dialogues'), schedule: read('schedule') } as Pack;

describe('phrasebook', () => {
  it('starts with survival, then what staff say', () => {
    const keys = bookLists(pack).map((l) => l.key);
    expect(keys.slice(0, 2)).toEqual([SURVIVAL, HEARD]);
    expect(bookLists(pack)[0].label).toBe('Survival 10');
  });

  it('keeps the survival order from pack.json', () => {
    expect(bookPhrases(pack, SURVIVAL).map((p) => p.id)).toEqual(pack.meta.survival);
  });

  it('lists staff lines only under They say', () => {
    expect(bookPhrases(pack, HEARD).every((p) => p.listen)).toBe(true);
    expect(bookPhrases(pack, 'food').some((p) => p.listen)).toBe(false);
    expect(bookPhrases(pack, 'food').length).toBeGreaterThan(0);
  });

  it('drops the survival list when the pack has none', () => {
    const bare = { ...pack, meta: { ...pack.meta, survival: undefined } };
    expect(bookLists(bare).map((l) => l.key)).not.toContain(SURVIVAL);
    expect(bookPhrases(bare, SURVIVAL)).toEqual([]);
  });
});
