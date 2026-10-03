import type { Pack, Phrase } from './types';

/** Phrasebook lists: the survival set, one per situation, and what staff say. No schedule, no grading. */
export const SURVIVAL = 'survival';
export const HEARD = 'heard';

export interface BookList { key: string; label: string }

export function bookLists(pack: Pack): BookList[] {
  const out: BookList[] = [];
  const n = pack.meta.survival?.length ?? 0;
  if (n) out.push({ key: SURVIVAL, label: `Survival ${n}` });
  if (bookPhrases(pack, HEARD).length) out.push({ key: HEARD, label: 'They say' });
  for (const s of pack.meta.situations) if (bookPhrases(pack, s).length) out.push({ key: s, label: s });
  return out;
}

/** Phrases in a list, in pack order (survival keeps its own order). Staff lines only appear under HEARD. */
export function bookPhrases(pack: Pack, key: string): Phrase[] {
  const all = pack.phrases.phrases;
  if (key === SURVIVAL) return (pack.meta.survival ?? []).map((id) => all.find((p) => p.id === id)).filter((p): p is Phrase => !!p);
  if (key === HEARD) return all.filter((p) => p.listen);
  return all.filter((p) => !p.listen && p.tags.includes(key));
}
