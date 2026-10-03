import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SrsState } from '../core/srs';

/** `added` = when the card was first studied, so a day's new phrases can be counted. */
export interface CardRecord extends SrsState { lang: string; id: string; added?: number }

interface Schema extends DBSchema {
  cards: { key: [string, string]; value: CardRecord };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined;
const db = () =>
  (dbp ??= openDB<Schema>('turisfasih', 2, {
    // Version 2 dropped study plans. Progress from version 1 is thrown away, not migrated.
    upgrade(d) {
      for (const name of [...d.objectStoreNames]) d.deleteObjectStore(name);
      d.createObjectStore('cards', { keyPath: ['lang', 'id'] });
      d.createObjectStore('kv');
    },
  }));

const langRange = (lang: string) => IDBKeyRange.bound([lang, ''], [lang, '￿']);

export async function getCards(lang: string): Promise<Map<string, CardRecord>> {
  const all = await (await db()).getAll('cards', langRange(lang));
  return new Map(all.map((c) => [c.id, c]));
}
export async function putCard(c: CardRecord) { await (await db()).put('cards', c); }

export async function kvGet<T>(key: string): Promise<T | undefined> { return (await (await db()).get('kv', key)) as T | undefined; }
export async function kvSet(key: string, value: unknown) { await (await db()).put('kv', value, key); }

export async function resetLanguage(lang: string) {
  const d = await db();
  await d.delete('cards', langRange(lang));
}

export interface Dump { cards: CardRecord[]; kv: [string, unknown][] }
export async function dumpAll(): Promise<Dump> {
  const d = await db();
  const kv: [string, unknown][] = [];
  for (const k of await d.getAllKeys('kv')) kv.push([k, await d.get('kv', k)]);
  return { cards: await d.getAll('cards'), kv };
}
/** Replaces everything. The caller must validate `dump` first. */
export async function restoreAll(dump: Dump) {
  const d = await db();
  const tx = d.transaction(['cards', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('cards').clear(), tx.objectStore('kv').clear()]);
  for (const c of dump.cards) tx.objectStore('cards').put(c);
  for (const [k, v] of dump.kv) tx.objectStore('kv').put(v, k);
  await tx.done;
}
