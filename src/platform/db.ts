import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SrsState } from '../core/srs';

export interface CardRecord extends SrsState { lang: string; id: string }
/** One row per language per day. `done` holds finished schedule task keys. */
export interface LogRecord { lang: string; date: string; done: string[]; reviews: number }

interface Schema extends DBSchema {
  cards: { key: [string, string]; value: CardRecord };
  log: { key: [string, string]; value: LogRecord };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined;
const db = () =>
  (dbp ??= openDB<Schema>('turisfasih', 1, {
    upgrade(d) {
      d.createObjectStore('cards', { keyPath: ['lang', 'id'] });
      d.createObjectStore('log', { keyPath: ['lang', 'date'] });
      d.createObjectStore('kv');
    },
  }));

const langRange = (lang: string) => IDBKeyRange.bound([lang, ''], [lang, '￿']);

/** Language of any saved progress. Older versions never saved a language choice, only progress. */
export async function progressLang(): Promise<string | undefined> {
  const d = await db();
  return (await d.getAll('cards', undefined, 1))[0]?.lang ?? (await d.getAll('log', undefined, 1))[0]?.lang;
}

export async function getCards(lang: string): Promise<Map<string, CardRecord>> {
  const all = await (await db()).getAll('cards', langRange(lang));
  return new Map(all.map((c) => [c.id, c]));
}
export async function putCard(c: CardRecord) { await (await db()).put('cards', c); }

export async function getLog(lang: string, date: string): Promise<LogRecord> {
  return (await (await db()).get('log', [lang, date])) ?? { lang, date, done: [], reviews: 0 };
}
export async function allLogs(lang: string): Promise<LogRecord[]> {
  return (await db()).getAll('log', langRange(lang));
}
export async function updateLog(lang: string, date: string, fn: (l: LogRecord) => void) {
  const d = await db();
  const tx = d.transaction('log', 'readwrite');
  const l = (await tx.store.get([lang, date])) ?? { lang, date, done: [], reviews: 0 };
  fn(l);
  await tx.store.put(l);
  await tx.done;
}

export async function kvGet<T>(key: string): Promise<T | undefined> { return (await (await db()).get('kv', key)) as T | undefined; }
export async function kvSet(key: string, value: unknown) { await (await db()).put('kv', value, key); }

export async function resetLanguage(lang: string) {
  const d = await db();
  const tx = d.transaction(['cards', 'log'], 'readwrite');
  await tx.objectStore('cards').delete(langRange(lang));
  await tx.objectStore('log').delete(langRange(lang));
  await tx.done;
}

export interface Dump { cards: CardRecord[]; log: LogRecord[]; kv: [string, unknown][] }
export async function dumpAll(): Promise<Dump> {
  const d = await db();
  const kv: [string, unknown][] = [];
  for (const k of await d.getAllKeys('kv')) kv.push([k, await d.get('kv', k)]);
  return { cards: await d.getAll('cards'), log: await d.getAll('log'), kv };
}
/** Replaces everything. The caller must validate `dump` first. */
export async function restoreAll(dump: Dump) {
  const d = await db();
  const tx = d.transaction(['cards', 'log', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('cards').clear(), tx.objectStore('log').clear(), tx.objectStore('kv').clear()]);
  for (const c of dump.cards) tx.objectStore('cards').put(c);
  for (const l of dump.log) tx.objectStore('log').put(l);
  for (const [k, v] of dump.kv) tx.objectStore('kv').put(v, k);
  await tx.done;
}
