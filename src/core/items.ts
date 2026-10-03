import type { Item, Pack } from './types';

/** Flattens a pack into reviewable items. Kana and phrases share one review pipeline. Phrasebook-only phrases are left out. */
export function buildItems(pack: Pack): Item[] {
  const items: Item[] = [];
  for (const s of pack.scripts.systems) {
    for (const g of s.groups) {
      for (const c of g.chars) {
        items.push({ id: c.id, kind: 'kana', front: c.char, reading: c.reading, speak: c.speak ?? c.char, system: s.id });
      }
    }
  }
  for (const p of pack.phrases.phrases) {
    if (p.book) continue; // phrasebook only
    items.push({
      id: p.id, kind: 'phrase', front: p.native, reading: p.reading, english: p.english,
      speak: p.speak ?? p.native, audioSrc: p.audioSrc, tags: p.tags, listen: p.listen,
    });
  }
  return items;
}

export function shuffle<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** `n` options including `correct`, drawn from `pool`, shuffled. */
export function choices<T>(correct: T, pool: readonly T[], n: number, same: (a: T, b: T) => boolean = (a, b) => a === b): T[] {
  const others = shuffle(pool.filter((x) => !same(x, correct))).slice(0, n - 1);
  return shuffle([correct, ...others]);
}
