import { buildItems } from './core/items';
import { listPacks, loadPack } from './core/packs';
import { MASTERED_DAYS, drillReview, isDue, newState, review, startOfDay, type Grade } from './core/srs';
import { DEFAULTS, cleanSettings, type Settings } from './core/settings';
import type { Item, Pack, PackMeta } from './core/types';
import { getCards, kvGet, kvSet, putCard, type CardRecord } from './platform/db';
import { speak, voicesReady } from './platform/tts';

export type { Settings };

/** Longest gap between reviews, so nothing disappears for months. */
const MAX_INTERVAL_DAYS = 30;
/** Most cards to bring back in one lesson. The rest wait for the next one. */
const MAX_DUE = 20;

export const app = {
  settings: { ...DEFAULTS } as Settings,
  packs: [] as PackMeta[],
  pack: undefined as unknown as Pack,
  items: [] as Item[],
  itemById: new Map<string, Item>(),
  cards: new Map<string, CardRecord>(),
};

/** Returns false when no language is chosen yet and there is more than one to choose from. */
export async function initApp(): Promise<boolean> {
  app.packs = await listPacks();
  const saved = await kvGet<unknown>('settings');
  app.settings = cleanSettings(saved);
  void voicesReady();
  if (!app.packs.some((p) => p.code === app.settings.lang)) {
    // With one pack there is nothing to ask.
    if (app.packs.length !== 1) { app.settings.lang = ''; return false; }
    await setLanguage(app.packs[0].code);
    return true;
  }
  await setLanguage(app.settings.lang, false);
  return true;
}

export async function setLanguage(code: string, persist = true) {
  app.settings.lang = code;
  app.pack = await loadPack(code);
  // Picks the native-script font for this language (Japanese and Chinese share characters but not glyphs).
  document.documentElement.dataset.pack = code;
  app.items = buildItems(app.pack);
  app.itemById = new Map(app.items.map((i) => [i.id, i]));
  await loadCards();
  if (persist) await saveSettings();
}

export const loadCards = async () => { app.cards = await getCards(app.settings.lang); };
export const saveSettings = () => kvSet('settings', app.settings);

/** Phrases in pack order, which is most useful first. */
export const phrases = (): Item[] => app.items.filter((i) => i.kind === 'phrase');
export const situationLabel = (id: string) => app.pack.meta.situations.find((s) => s.id === id)?.label ?? id;

/** Phrases studied before that are due again, oldest first. */
export function dueItems(pool: Item[] = phrases()): Item[] {
  const t = Date.now();
  return pool.filter((i) => { const c = app.cards.get(i.id); return c && isDue(c, t); })
    .sort((a, b) => app.cards.get(a.id)!.due - app.cards.get(b.id)!.due);
}

/** Phrases never studied, most useful first. */
export const newItems = (pool: Item[] = phrases()): Item[] => pool.filter((i) => !app.cards.has(i.id));

/** Remembered at least once and not forgotten since. */
export const isLearned = (id: string) => (app.cards.get(id)?.interval ?? 0) >= 1;

/** New phrases first studied today. */
const newToday = () => { const t = startOfDay(Date.now()); return [...app.cards.values()].filter((c) => (c.added ?? 0) >= t).length; };

/**
 * Cards due again, then new ones. The daily lesson stops adding new phrases once the day's limit
 * is reached. A topic the learner opens on purpose (`daily` false) always offers a few.
 */
export function lessonItems(pool: Item[] = phrases(), daily = true): { due: Item[]; fresh: Item[] } {
  const room = daily ? Math.max(0, app.settings.newPerSession - newToday()) : app.settings.newPerSession;
  return { due: dueItems(pool).slice(0, MAX_DUE), fresh: newItems(pool).slice(0, room) };
}

/** Records a grade and schedules the next review. */
export async function grade(item: Item, g: Grade) {
  const t = Date.now();
  const prev = app.cards.get(item.id);
  const state = review(prev ?? newState(t), g, t, { maxIntervalDays: MAX_INTERVAL_DAYS });
  const rec: CardRecord = { lang: app.settings.lang, id: item.id, added: prev?.added ?? t, ...state };
  app.cards.set(item.id, rec);
  await putCard(rec);
}

/** Records a drill answer. Right answers on cards that are not due do not move the schedule. */
export async function gradeDrill(item: Item, correct: boolean) {
  const state = drillReview(app.cards.get(item.id), correct, Date.now(), { maxIntervalDays: MAX_INTERVAL_DAYS });
  if (!state) return;
  const rec: CardRecord = { lang: app.settings.lang, id: item.id, ...state };
  app.cards.set(item.id, rec);
  await putCard(rec);
}

export function say(text: string, audioSrc?: string) {
  return speak(text, {
    locale: app.pack.meta.ttsLocale, rate: app.settings.rate, voiceURI: app.settings.voice[app.settings.lang],
    audioSrc, lang: app.settings.lang,
  });
}

export { MASTERED_DAYS };
