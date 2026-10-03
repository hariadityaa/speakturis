import { isValidSettings } from '../core/settings';
import { dumpAll, restoreAll, type Dump } from './db';

const APP = 'turisfasih';
const VERSION = 2;

/** How the backup left the app. 'cancelled' means the user closed the share sheet. */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await dumpAll();
  const body = JSON.stringify({ app: APP, version: VERSION, exportedAt: new Date().toISOString(), data });
  const name = `turisfasih-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([body], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // Share sheet on Android lets the user save to Drive. Fall back to a plain download.
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return 'downloaded';
}

const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown) => typeof x === 'string';

/** Throws a readable error if the file is not a valid backup. Nothing is written until it passes. */
export function parseBackup(text: string): Dump {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error('Not a JSON file.'); }
  if (j?.app !== APP) throw new Error('Not a TurisTalk backup.');
  if (j.version !== VERSION) throw new Error(`Unsupported backup version ${j.version}.`);
  const d = j.data;
  if (!d || !Array.isArray(d.cards) || !Array.isArray(d.kv)) throw new Error('Backup is incomplete.');
  for (const c of d.cards) {
    if (typeof c !== 'object' || c === null) throw new Error('Backup has a corrupt card.');
    if (!isStr(c.lang) || !isStr(c.id) || !isNum(c.ease) || !isNum(c.interval) || !isNum(c.due) || !isNum(c.reps) || !isNum(c.lapses)) throw new Error('Backup has a corrupt card.');
  }
  for (const kv of d.kv) {
    if (!Array.isArray(kv) || !isStr(kv[0])) throw new Error('Backup has corrupt settings.');
    if (kv[0] === 'settings' && !isValidSettings(kv[1])) throw new Error('Backup has corrupt settings.');
  }
  return d as Dump;
}

export async function importBackup(file: File): Promise<{ cards: number }> {
  const dump = parseBackup(await file.text());
  await restoreAll(dump);
  return { cards: dump.cards.length };
}
