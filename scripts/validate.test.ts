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





  it('rejects numbers with a missing digit word', () => {
    edit('numbers.json', (j) => { delete j.words['5']; });
    expect(validatePack(dir).join('\n')).toMatch(/numbers.json/);
  });

  it('rejects a pack whose code differs from its folder', () => {
    edit('pack.json', (j) => { j.code = 'ko'; });
    expect(validatePack(dir).join('\n')).toMatch(/must match folder name/);
  });


  it('rejects a duplicate situation', () => {
    edit('pack.json', (j) => { j.situations.push(j.situations[0]); });
    expect(validatePack(dir).join('\n')).toMatch(/duplicate situation id/);
  });

  it('accepts a pack with no scripts', () => {
    edit('scripts.json', (j) => { j.systems = []; });
    expect(validatePack(dir)).toEqual([]);
  });

});
