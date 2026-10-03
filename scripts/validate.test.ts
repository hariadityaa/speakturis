import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validatePack } from './validate';

const SRC = join(__dirname, '..', 'content', 'ja');
let root: string;
let dir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'pack-'));
  dir = join(root, 'ja'); // folder name must equal pack code
  cpSync(SRC, dir, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const edit = (file: string, fn: (j: any) => void) => {
  const p = join(dir, file);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  fn(j);
  writeFileSync(p, JSON.stringify(j));
};

describe('validatePack', () => {
  it('accepts the shipped Japanese pack', () => {
    expect(validatePack(dir)).toEqual([]);
  });

  it('rejects a missing file', () => {
    rmSync(join(dir, 'phrases.json'));
    expect(validatePack(dir).join('\n')).toMatch(/phrases.json: missing file/);
  });

  it('rejects a schema violation', () => {
    edit('phrases.json', (j) => { j.phrases[0].difficulty = 9; });
    expect(validatePack(dir).join('\n')).toMatch(/phrases.json/);
  });

  it('rejects an unknown situation tag', () => {
    edit('phrases.json', (j) => { j.phrases[0].tags = ['nonsense']; });
    expect(validatePack(dir).join('\n')).toMatch(/tag "nonsense"/);
  });

  it('rejects duplicate phrase ids', () => {
    edit('phrases.json', (j) => { j.phrases[1].id = j.phrases[0].id; });
    expect(validatePack(dir).join('\n')).toMatch(/duplicate phrase id/);
  });

  it('rejects a dialogue reply pointing to a missing node', () => {
    edit('dialogues.json', (j) => { j.dialogues[0].nodes.n1.replies[0].next = 'ghost'; });
    expect(validatePack(dir).join('\n')).toMatch(/missing node "ghost"/);
  });

  it('rejects a schedule that references a missing kana group', () => {
    edit('schedule.json', (j) => { j.plans[0].weeks[0].tasks.push({ type: 'kana', ref: 'k-nope', minutes: 1, days: [1] }); j.plans[0].dailyMinutes = 60; });
    expect(validatePack(dir).join('\n')).toMatch(/unknown kana group/);
  });

  it('rejects a task with an unknown phrase', () => {
    edit('schedule.json', (j) => { j.plans[0].weeks[0].tasks[1].phraseIds.push('p-nope'); });
    expect(validatePack(dir).join('\n')).toMatch(/unknown phrase "p-nope"/);
  });

  it('rejects a phrase introduced twice in one plan', () => {
    edit('schedule.json', (j) => { const t = j.plans[1].weeks[0].tasks; t[2].phraseIds.push(t[1].phraseIds[0]); });
    expect(validatePack(dir).join('\n')).toMatch(/duplicate plan month phraseIds/);
  });

  it('rejects duplicate plan ids', () => {
    edit('schedule.json', (j) => { j.plans[1].id = j.plans[0].id; });
    expect(validatePack(dir).join('\n')).toMatch(/duplicate plan id/);
  });

  it('rejects numbers with a missing digit word', () => {
    edit('numbers.json', (j) => { delete j.words['5']; });
    expect(validatePack(dir).join('\n')).toMatch(/numbers.json/);
  });

  it('rejects an unknown survival phrase', () => {
    edit('pack.json', (j) => { j.survival = ['p-nope']; });
    expect(validatePack(dir).join('\n')).toMatch(/survival "p-nope"/);
  });

  it('rejects a staff line in the survival list', () => {
    edit('pack.json', (j) => { j.survival = ['h-nanmei']; });
    expect(validatePack(dir).join('\n')).toMatch(/survival "h-nanmei" is not a phrase you say/);
  });

  it('rejects a replyId that does not resolve', () => {
    edit('phrases.json', (j) => { j.phrases.find((x: any) => x.id === 'h-nanmei').replyId = 'p-ghost'; });
    expect(validatePack(dir).join('\n')).toMatch(/replyId "p-ghost"/);
  });

  it('rejects a replyId on a phrase you say', () => {
    edit('phrases.json', (j) => { j.phrases[0].replyId = 'p-arigatou'; });
    expect(validatePack(dir).join('\n')).toMatch(/only listen phrases can have a replyId/);
  });

  it('rejects a pack whose code differs from its folder', () => {
    edit('pack.json', (j) => { j.code = 'ko'; });
    expect(validatePack(dir).join('\n')).toMatch(/must match folder name/);
  });
  it('rejects a phrase that no plan introduces', () => {
    edit('phrases.json', (j) => { j.phrases.push({ ...j.phrases[0], id: 'p-orphan' }); });
    expect(validatePack(dir).join('\n')).toMatch(/"p-orphan" is never introduced/);
  });

  it('rejects a study day over the daily minutes', () => {
    edit('schedule.json', (j) => { j.plans[0].weeks[0].tasks[0].minutes = 30; });
    expect(validatePack(dir).join('\n')).toMatch(/above dailyMinutes/);
  });

  it('accepts a pack with no scripts', () => {
    edit('scripts.json', (j) => { j.systems = []; });
    expect(validatePack(dir)).toEqual([]);
  });

  it('rejects a kana group that is never scheduled', () => {
    edit('scripts.json', (j) => { j.systems = [{ id: 'kata', name: 'Katakana', groups: [{ id: 'k-a', label: 'A', chars: [{ id: 'ka-a', char: 'ア', reading: 'a' }] }] }]; });
    edit('pack.json', (j) => { j.scriptSystems = ['kata']; });
    expect(validatePack(dir).join('\n')).toMatch(/never scheduled/);
  });
});
