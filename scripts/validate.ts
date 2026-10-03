/**
 * Validates every language pack in /content against /schema, then runs cross-file checks
 * (IDs resolve, dialogue graphs are sound, schedule fits the study window, every number composes).
 * Exit code 1 on any error, so CI fails.
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeNumber } from '../src/core/numbers.ts';
import type { Pack } from '../src/core/types.ts';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const FILES = ['pack', 'scripts', 'phrases', 'numbers', 'dialogues', 'schedule'] as const;
type FileKey = (typeof FILES)[number];

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = Object.fromEntries(
  FILES.map((f) => [f, ajv.compile(JSON.parse(readFileSync(join(ROOT, 'schema', `${f}.schema.json`), 'utf8')))]),
) as Record<FileKey, ReturnType<typeof ajv.compile>>;

const DAY = 86_400_000;
const parseDate = (s: string) => Date.parse(`${s}T00:00:00Z`);

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
  if (Number.isNaN(parseDate(meta.studyStart))) err('pack.json', 'studyStart is not a valid date');
  if (Number.isNaN(parseDate(meta.trip.date))) err('pack.json', 'trip.date is not a valid date');

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
    for (const t of ph.tags) if (!meta.situations.includes(t)) err('phrases.json', `${ph.id}: tag "${t}" not in pack.json situations`);
    if (ph.audioSrc && !existsSync(join(dir, ph.audioSrc))) err('phrases.json', `${ph.id}: audioSrc "${ph.audioSrc}" file not found`);
  }
  if (charIds.some((id) => phraseIds.includes(id))) err('phrases.json', 'a phrase id collides with a character id');

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
    if (!meta.situations.includes(d.situation)) err('dialogues.json', `${d.id}: situation "${d.situation}" not in pack.json situations`);
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

  // 7. Schedule
  const weeks = p.schedule.weeks;
  weeks.forEach((w, i) => { if (w.week !== i + 1) err('schedule.json', `weeks must be numbered 1..N in order (found ${w.week} at position ${i + 1})`); });
  const daysToTrip = (parseDate(meta.trip.date) - parseDate(meta.studyStart)) / DAY;
  if (weeks.length * 7 > daysToTrip) err('schedule.json', `${weeks.length} weeks do not fit in the ${daysToTrip} days before the trip`);
  const introduced: string[] = [];
  for (const w of weeks) {
    // Each study day (1-6) must have work and fit the daily budget.
    for (let day = 1; day <= 6; day++) {
      const total = w.tasks.filter((t) => !t.days || t.days.includes(day)).reduce((acc, t) => acc + t.minutes, 0);
      if (total === 0) err('schedule.json', `week ${w.week} day ${day}: no tasks`);
      if (total > p.schedule.dailyMinutes) err('schedule.json', `week ${w.week} day ${day}: ${total} min, above dailyMinutes ${p.schedule.dailyMinutes}`);
    }
    for (const t of w.tasks) {
      const where = `week ${w.week} ${t.type}`;
      if (t.type === 'kana' && t.ref && !groupIds.includes(t.ref)) err('schedule.json', `${where}: unknown kana group "${t.ref}"`);
      if (t.type === 'reading' && t.ref && !setIds.includes(t.ref)) err('schedule.json', `${where}: unknown word set "${t.ref}"`);
      if (t.type === 'dialogue' && t.ref && !p.dialogues.dialogues.some((d) => d.id === t.ref)) err('schedule.json', `${where}: unknown dialogue "${t.ref}"`);
      if (t.days && t.days.some((d) => d < 1 || d > 6)) err('schedule.json', `${where}: days must be 1-6`);
      if (t.type === 'reading' && !t.ref) err('schedule.json', `${where}: needs ref`);
      if (t.type === 'dialogue' && !t.ref) err('schedule.json', `${where}: needs ref`);
    }
    for (const id of w.newPhraseIds ?? []) {
      if (!phraseIds.includes(id)) err('schedule.json', `week ${w.week}: unknown phrase "${id}"`);
      introduced.push(id);
    }
  }
  dup('schedule.json', 'newPhraseIds', introduced);
  for (const id of phraseIds) if (!introduced.includes(id)) err('schedule.json', `phrase "${id}" is never introduced by newPhraseIds`);
  const scheduledGroups = new Set(weeks.flatMap((w) => w.tasks.filter((t) => t.type === 'kana' && t.ref).map((t) => t.ref!)));
  for (const g of groupIds) if (!scheduledGroups.has(g)) err('schedule.json', `kana group "${g}" is never scheduled`);

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
