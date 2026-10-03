import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL, HEARD, STARRED, SURVIVAL, bookLists, bookPhrases, bookSections, cleanStars, matchPhrase, starredFirst, translateUrl } from './phrasebook';
import type { Pack, Phrase } from './types';

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../content/ja/${f}.json`, import.meta.url), 'utf8'));
const pack = { meta: read('pack'), scripts: read('scripts'), phrases: read('phrases'), numbers: read('numbers'), dialogues: read('dialogues') } as Pack;

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

  it('labels topics from pack.json and lists every phrase under All', () => {
    expect(bookLists(pack).find((l) => l.key === 'food')?.label).toBe('Food and drink');
    expect(bookPhrases(pack, ALL)).toHaveLength(pack.phrases.phrases.length);
  });

  it('drops the survival list when the pack has none', () => {
    const bare = { ...pack, meta: { ...pack.meta, survival: undefined } };
    expect(bookLists(bare).map((l) => l.key)).not.toContain(SURVIVAL);
    expect(bookPhrases(bare, SURVIVAL)).toEqual([]);
  });

  describe('stars', () => {
    const food = bookPhrases(pack, 'food');
    const pick = new Set([food[2].id, food[1].id]);

    it('shows the Starred chip first, only when something is starred', () => {
      expect(bookLists(pack).map((l) => l.key)).not.toContain(STARRED);
      expect(bookLists(pack, pick)[0]).toEqual({ key: STARRED, label: 'Starred' });
    });

    it('lists starred phrases in pack order under Starred', () => {
      expect(bookPhrases(pack, STARRED, pick).map((p) => p.id)).toEqual([food[1].id, food[2].id]);
      expect(bookPhrases(pack, STARRED)).toEqual([]);
    });

    it('puts starred first in other lists, then the rest in pack order', () => {
      const got = bookPhrases(pack, 'food', pick).map((p) => p.id);
      expect(got.slice(0, 2)).toEqual([food[1].id, food[2].id]);
      expect(got.slice(2)).toEqual(food.filter((p) => !pick.has(p.id)).map((p) => p.id));
      expect(got).toHaveLength(food.length);
    });

    it('works on survival, which has its own order', () => {
      const id = pack.meta.survival![3];
      expect(bookPhrases(pack, SURVIVAL, new Set([id]))[0].id).toBe(id);
    });

    it('leaves order alone with no stars', () => {
      const all = pack.phrases.phrases;
      expect(starredFirst(all, new Set())).toBe(all);
    });

    it('adds a Starred section to All, and starred phrases stay in their topic', () => {
      const sections = bookSections(pack, pick);
      expect(sections[0].key).toBe(STARRED);
      const topic = sections.find((s) => s.key === pack.phrases.phrases.find((p) => p.id === food[1].id)!.tags[0])!;
      expect(topic.phrases.some((p) => p.id === food[1].id)).toBe(true);
      expect(bookSections(pack)[0].key).not.toBe(STARRED);
    });

    it('ignores stored ids that are not in the pack', () => {
      expect([...cleanStars([food[0].id, 'gone', 7], pack)]).toEqual([food[0].id]);
      expect(cleanStars('junk', pack).size).toBe(0);
      expect(cleanStars(undefined, pack).size).toBe(0);
    });
  });

  describe('search', () => {
    const lift: Phrase = { id: 'x', native: 'エレベーター', reading: 'erebeetaa', english: 'Where is the elevator?', tags: ['help'], difficulty: 1, keywords: ['lift'] };
    const thanks: Phrase = { id: 'y', native: '謝謝', reading: 'xièxie', english: 'Thank you', tags: ['greeting'], difficulty: 1 };

    it('matches english, reading, native and keywords', () => {
      expect(matchPhrase(lift, 'elevator')).toBe(true);
      expect(matchPhrase(lift, 'erebee')).toBe(true);
      expect(matchPhrase(lift, 'エレ')).toBe(true);
      expect(matchPhrase(lift, 'lift')).toBe(true);
      expect(matchPhrase(lift, 'stairs')).toBe(false);
    });

    it('ignores pinyin tone marks and case', () => {
      expect(matchPhrase(thanks, 'xiexie')).toBe(true);
      expect(matchPhrase(thanks, 'XIÈXIE')).toBe(true);
      expect(matchPhrase(thanks, 'THANK')).toBe(true);
    });

    it('needs every word, and an empty query matches all', () => {
      expect(matchPhrase(lift, 'where lift')).toBe(true);
      expect(matchPhrase(lift, 'where bus')).toBe(false);
      expect(matchPhrase(lift, '  ')).toBe(true);
    });
  });

  describe('translateUrl', () => {
    it('uses the bare language, except for Chinese', () => {
      expect(translateUrl('ja-JP', 'toilet')).toBe('https://translate.google.com/?sl=en&tl=ja&text=toilet&op=translate');
      expect(translateUrl('zh-TW', 'a b&c')).toBe('https://translate.google.com/?sl=en&tl=zh-TW&text=a%20b%26c&op=translate');
    });
  });
});
