/**
 * Validates every language pack in /content against /schema, then runs cross-file checks
 * (IDs resolve, dialogue graphs are sound, every number composes).
 * Exit code 1 on any error, so CI fails.
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeNumber } from '../src/core/numbers.ts';
import type { Pack } from '../src/core/types.ts';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const FILES = ['pack', 'scripts', 'phrases', 'numbers', 'dialogues'] as const;
type FileKey = (typeof FILES)[number];

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = Object.fromEntries(
  FILES.map((f) => [f, ajv.compile(JSON.parse(readFileSync(join(ROOT, 'schema', `${f}.schema.json`), 'utf8')))]),
) as Record<FileKey, ReturnType<typeof ajv.compile>>;

export function validatePack(dir: string): string[] {
  const errors: string[] = [];
  const err = (file: string, msg: string) => errors.push(`${file}: ${msg}`);
  const data: Partial<Record<FileKey, unknown>> = {};

  // 1. Structure: each file parses and matches its schema.
  for (const f of FILES) {
    const path = join(dir, `${f}.json`);
    if (!existsSync(path)) { err(`${f}.json`, 'missing file'); continue; }
    let json: unknown;
    try { json = JSON.parse(readFileSync(path, 'utf8')); }
    catch (e) { err(`${f}.json`, `invalid JSON (${(e as Error).message})`); continue; }
    if (!validators[f](json)) {
      for (const e of validators[f].errors ?? []) err(`${f}.json`, `${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    data[f] = json;
  }
  if (errors.length) return errors; // cross-checks need valid shapes
  const p = { ...(data as object), meta: data.pack } as unknown as Pack;
  const { meta } = p;

  const dup = (file: string, label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) { if (seen.has(id)) err(file, `duplicate ${label} id "${id}"`); seen.add(id); }
  };

  // 2. Pack meta
  if (dir.split(/[\\/]/).pop() !== meta.code) err('pack.json', `code "${meta.code}" must match folder name`);
  const situations = meta.situations.map((x) => x.id);
  dup('pack.json', 'situation', situations);

  // 3. Scripts
  const systemIds = p.scripts.systems.map((s) => s.id);
  dup('scripts.json', 'system', systemIds);
  for (const s of meta.scriptSystems) if (!systemIds.includes(s)) err('pack.json', `scriptSystems "${s}" not found in scripts.json`);
  for (const s of systemIds) if (!meta.scriptSystems.includes(s)) err('scripts.json', `system "${s}" missing from pack.json scriptSystems`);
  const groupIds: string[] = [];
  const charIds: string[] = [];
  const setIds: string[] = [];
  const wordIds: string[] = [];
  for (const s of p.scripts.systems) {
    for (const g of s.groups) { groupIds.push(g.id); for (const c of g.chars) charIds.push(c.id); }
    for (const ws of s.wordSets ?? []) { setIds.push(ws.id); for (const w of ws.words) wordIds.push(w.id); }
  }
  dup('scripts.json', 'group', groupIds);
  dup('scripts.json', 'char', charIds);
  dup('scripts.json', 'wordSet', setIds);
  dup('scripts.json', 'word', wordIds);

  // 4. Phrases
  const phraseIds = p.phrases.phrases.map((x) => x.id);
  dup('phrases.json', 'phrase', phraseIds);
  for (const ph of p.phrases.phrases) {
    for (const t of ph.tags) if (!situations.includes(t)) err('phrases.json', `${ph.id}: tag "${t}" not in pack.json situations`);
    if (ph.audioSrc && !existsSync(join(dir, ph.audioSrc))) err('phrases.json', `${ph.id}: audioSrc "${ph.audioSrc}" file not found`);
  }
  if (charIds.some((id) => phraseIds.includes(id))) err('phrases.json', 'a phrase id collides with a character id');
  // A staff line's reply and the survival list must be phrases you say, not ones you hear.
  const said = (id: string) => p.phrases.phrases.some((x) => x.id === id && !x.listen);
  for (const ph of p.phrases.phrases) {
    if (!ph.replyId) continue;
    if (!ph.listen) err('phrases.json', `${ph.id}: only listen phrases can have a replyId`);
    if (!said(ph.replyId)) err('phrases.json', `${ph.id}: replyId "${ph.replyId}" is not a phrase you say`);
  }
  for (const id of meta.survival ?? []) if (!said(id)) err('pack.json', `survival "${id}" is not a phrase you say`);

  // 5. Numbers: every integer in range must compose; words cover 0..9
  for (let i = 0; i <= 9; i++) if (!p.numbers.words[String(i)]) err('numbers.json', `words must define ${i}`);
  const { min, max } = p.numbers.range;
  if (min > max) err('numbers.json', 'range.min is above range.max');
  else {
    try { for (let n = min; n <= max; n++) composeNumber(n, p.numbers); }
    catch (e) { err('numbers.json', (e as Error).message); }
  }
  const pd = p.numbers.priceDrill;
  if (pd.min > pd.max) err('numbers.json', 'priceDrill.min is above priceDrill.max');
  if (pd.max > max) err('numbers.json', 'priceDrill.max exceeds range.max');

  // 6. Dialogues
  dup('dialogues.json', 'dialogue', p.dialogues.dialogues.map((d) => d.id));
  for (const d of p.dialogues.dialogues) {
    if (!situations.includes(d.situation)) err('dialogues.json', `${d.id}: situation "${d.situation}" not in pack.json situations`);
    if (!d.nodes[d.start]) err('dialogues.json', `${d.id}: start node "${d.start}" does not exist`);
    for (const [nid, node] of Object.entries(d.nodes)) {
      if (node.end && node.replies?.length) err('dialogues.json', `${d.id}.${nid}: end node must not have replies`);
      if (!node.end && !node.replies?.length) err('dialogues.json', `${d.id}.${nid}: non-end node needs replies`);
      for (const r of node.replies ?? []) {
        if (!d.nodes[r.next]) err('dialogues.json', `${d.id}.${nid}: reply points to missing node "${r.next}"`);
        if (r.phraseId) { if (!phraseIds.includes(r.phraseId)) err('dialogues.json', `${d.id}.${nid}: unknown phraseId "${r.phraseId}"`); }
        else if (!r.native || !r.reading || !r.english) err('dialogues.json', `${d.id}.${nid}: reply needs phraseId or native+reading+english`);
      }
      if (node.replies && !node.replies.some((r) => r.good)) err('dialogues.json', `${d.id}.${nid}: no good reply`);
    }
    // every node reachable from start, and every reachable node can reach an end
    const reach = new Set<string>();
    const walk = (id: string) => { if (reach.has(id) || !d.nodes[id]) return; reach.add(id); d.nodes[id].replies?.forEach((r) => walk(r.next)); };
    walk(d.start);
    for (const id of Object.keys(d.nodes)) if (!reach.has(id)) err('dialogues.json', `${d.id}: node "${id}" is unreachable`);
    const canEnd = new Set(Object.keys(d.nodes).filter((id) => d.nodes[id].end));
    for (let changed = true; changed;) {
      changed = false;
      for (const [id, n] of Object.entries(d.nodes)) if (!canEnd.has(id) && n.replies?.some((r) => canEnd.has(r.next))) { canEnd.add(id); changed = true; }
    }
    for (const id of reach) if (!canEnd.has(id)) err('dialogues.json', `${d.id}: node "${id}" cannot reach an end`);
  }

  return errors;
}

function main() {
  const contentDir = join(ROOT, 'content');
  const packs = readdirSync(contentDir).filter((n) => statSync(join(contentDir, n)).isDirectory());
  if (!packs.length) { console.error('No packs found in /content'); process.exit(1); }
  let failed = 0;
  for (const code of packs) {
    const errs = validatePack(join(contentDir, code));
    if (errs.length) { failed++; console.error(`✗ ${code}`); errs.forEach((e) => console.error(`    ${e}`)); }
    else console.log(`✓ ${code}`);
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
