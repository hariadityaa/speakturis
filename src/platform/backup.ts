import { isValidSettings } from '../core/settings';
import { dumpAll, restoreAll, type Dump } from './db';

const APP = 'speakturis';
const VERSION = 1;

export async function exportBackup(): Promise<void> {
  const data = await dumpAll();
  const body = JSON.stringify({ app: APP, version: VERSION, exportedAt: new Date().toISOString(), data });
  const name = `speakturis-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([body], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // Share sheet on Android lets the user save to Drive. Fall back to a plain download.
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown) => typeof x === 'string';

/** Throws a readable error if the file is not a valid backup. Nothing is written until it passes. */
export function parseBackup(text: string): Dump {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error('Not a JSON file.'); }
  if (j?.app !== APP) throw new Error('Not a Speakturis backup.');
  if (j.version !== VERSION) throw new Error(`Unsupported backup version ${j.version}.`);
  const d = j.data;
  if (!d || !Array.isArray(d.cards) || !Array.isArray(d.log) || !Array.isArray(d.kv)) throw new Error('Backup is incomplete.');
  for (const c of d.cards) {
    if (typeof c !== 'object' || c === null) throw new Error('Backup has a corrupt card.');
    if (!isStr(c.lang) || !isStr(c.id) || !isNum(c.ease) || !isNum(c.interval) || !isNum(c.due) || !isNum(c.reps) || !isNum(c.lapses)) throw new Error('Backup has a corrupt card.');
  }
  for (const l of d.log) {
    if (typeof l !== 'object' || l === null) throw new Error('Backup has a corrupt log entry.');
    if (!isStr(l.lang) || !isStr(l.date) || !Array.isArray(l.done) || !isNum(l.reviews)) throw new Error('Backup has a corrupt log entry.');
  }
  for (const kv of d.kv) {
    if (!Array.isArray(kv) || !isStr(kv[0])) throw new Error('Backup has corrupt settings.');
    if (kv[0] === 'settings' && !isValidSettings(kv[1])) throw new Error('Backup has corrupt settings.');
  }
  return d as Dump;
}

export async function importBackup(file: File): Promise<{ cards: number; days: number }> {
  const dump = parseBackup(await file.text());
  await restoreAll(dump);
  return { cards: dump.cards.length, days: dump.log.length };
}
