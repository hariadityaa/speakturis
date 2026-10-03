import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

const wrap = (data: unknown, version = 2) => JSON.stringify({ app: 'turisfasih', version, data });
const card = { lang: 'ja', id: 'a', ease: 2.5, interval: 1, due: 1, reps: 1, lapses: 0 };

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    const d = parseBackup(wrap({ cards: [card], kv: [['settings', { lang: 'ja', rate: 0.8 }]] }));
    expect(d.cards).toHaveLength(1);
  });
  it('accepts star lists in kv', () => {
    const d = parseBackup(wrap({ cards: [], kv: [['stars:ja', ['a', 'b']], ['stars:zh', []]] }));
    expect(d.kv).toHaveLength(2);
  });
  it.each([
    ['not json', 'hello'],
    ['array', '[]'],
    ['null', 'null'],
    ['wrong app', JSON.stringify({ app: 'x', version: 2, data: {} })],
    ['old version', wrap({ cards: [], log: [], kv: [] }, 1)],
    ['incomplete', wrap({ cards: [] })],
    ['bad card field', wrap({ cards: [{ ...card, ease: 'a' }], kv: [] })],
    ['null card', wrap({ cards: [null], kv: [] })],
    ['bad kv', wrap({ cards: [], kv: [[1, 2]] })],
    ['bad settings value', wrap({ cards: [], kv: [['settings', { lang: 'ja', rate: 'fast' }]] })],
  ])('rejects %s with a readable error', (_n, text) => {
    expect(() => parseBackup(text)).toThrow(/^(Not a JSON file|Not a TurisTalk backup|Unsupported backup version 1|Backup (is incomplete|has a corrupt card|has corrupt settings))\.$/);
  });
});
