import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

const wrap = (data: unknown, version = 1) => JSON.stringify({ app: 'turisfasih', version, data });
const card = { lang: 'ja', id: 'a', ease: 2.5, interval: 1, due: 1, reps: 1, lapses: 0 };

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    const d = parseBackup(wrap({ cards: [card], log: [{ lang: 'ja', date: '2026-10-03', done: [], reviews: 1 }], kv: [['settings', { lang: 'ja', rate: 0.8 }]] }));
    expect(d.cards).toHaveLength(1);
  });
  it.each([
    ['not json', 'hello'],
    ['array', '[]'],
    ['null', 'null'],
    ['wrong app', JSON.stringify({ app: 'x', version: 1, data: {} })],
    ['wrong version', wrap({ cards: [], log: [], kv: [] }, 2)],
    ['incomplete', wrap({ cards: [] })],
    ['bad card field', wrap({ cards: [{ ...card, ease: 'a' }], log: [], kv: [] })],
    ['null card', wrap({ cards: [null], log: [], kv: [] })],
    ['null log entry', wrap({ cards: [], log: [null], kv: [] })],
    ['bad log entry', wrap({ cards: [], log: [{ lang: 'ja', date: 5 }], kv: [] })],
    ['bad kv', wrap({ cards: [], log: [], kv: [[1, 2]] })],
    ['bad settings value', wrap({ cards: [], log: [], kv: [['settings', { lang: 'ja', rate: 'fast' }]] })],
  ])('rejects %s with a readable error', (_n, text) => {
    expect(() => parseBackup(text)).toThrow(/^(Not a JSON file|Not a Turisfasih backup|Unsupported backup version 2|Backup (is incomplete|has a corrupt (card|log entry)|has corrupt settings))\.$/);
  });
});
