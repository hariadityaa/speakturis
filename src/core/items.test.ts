import { describe, expect, it } from 'vitest';
import { buildItems } from './items';
import { bookPhrases, ALL } from './phrasebook';
import type { Pack, Phrase } from './types';

const ph = (id: string, extra: Partial<Phrase> = {}): Phrase => ({ id, native: id, reading: id, english: id, tags: ['t'], difficulty: 1, ...extra });
const pack = {
  meta: { situations: [{ id: 't', label: 'T' }] },
  scripts: { systems: [] },
  phrases: { phrases: [ph('a'), ph('b', { book: true }), ph('c')] },
} as unknown as Pack;

describe('book-only phrases', () => {
  it('never become lesson items', () => {
    expect(buildItems(pack).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('still appear in the phrasebook and topic lists', () => {
    expect(bookPhrases(pack, ALL).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(bookPhrases(pack, 't').map((p) => p.id)).toContain('b');
  });
});
