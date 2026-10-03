import type { Pack, Phrase } from './types';

/** Phrasebook lists: everything, the survival set, what staff say, and one per topic. No grading. */
export const ALL = 'all';
export const SURVIVAL = 'survival';
export const HEARD = 'heard';

export interface BookList { key: string; label: string }

/** The lists after "All", in display order. Empty lists are left out. */
export function bookLists(pack: Pack): BookList[] {
  const out: BookList[] = [];
  const n = pack.meta.survival?.length ?? 0;
  if (n) out.push({ key: SURVIVAL, label: `Survival ${n}` });
  if (bookPhrases(pack, HEARD).length) out.push({ key: HEARD, label: 'They say' });
  for (const s of pack.meta.situations) if (bookPhrases(pack, s.id).length) out.push({ key: s.id, label: s.label });
  return out;
}

/** Phrases in a list, in pack order (survival keeps its own order). Staff lines appear under HEARD, not under a topic. */
export function bookPhrases(pack: Pack, key: string): Phrase[] {
  const all = pack.phrases.phrases;
  if (key === ALL) return all;
  if (key === SURVIVAL) return (pack.meta.survival ?? []).map((id) => all.find((p) => p.id === id)).filter((p): p is Phrase => !!p);
  if (key === HEARD) return all.filter((p) => p.listen);
  return all.filter((p) => !p.listen && p.tags.includes(key));
}
