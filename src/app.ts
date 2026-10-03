import { buildItems } from './core/items';
import { listPacks, loadPack } from './core/packs';
import { planFor, unlockedIds, type Plan } from './core/schedule';
import { MASTERED_DAYS, drillReview, isDue, newState, review, type Grade } from './core/srs';
import { localDate } from './core/dates';
import { DEFAULTS, cleanSettings, type Settings } from './core/settings';
import type { Item, Pack, PackMeta } from './core/types';
import { getCards, kvGet, progressLang, kvSet, putCard, updateLog, type CardRecord } from './platform/db';
import { speak, voicesReady } from './platform/tts';

export type { Settings };

export const app = {
  settings: { ...DEFAULTS } as Settings,
  packs: [] as PackMeta[],
  pack: undefined as unknown as Pack,
  items: [] as Item[],
  itemById: new Map<string, Item>(),
  cards: new Map<string, CardRecord>(),
};

/** Returns false when no language is chosen yet. */
export async function initApp(): Promise<boolean> {
  app.packs = await listPacks();
  const saved = await kvGet<unknown>('settings');
  app.settings = cleanSettings(saved);
  void voicesReady();
  if (!app.packs.some((p) => p.code === app.settings.lang)) app.settings.lang = (await progressLang()) ?? '';
  // First run (or a saved language that no longer exists): leave the pack unloaded so main.ts asks.
  if (!app.packs.some((p) => p.code === app.settings.lang)) { app.settings.lang = ''; return false; }
  await setLanguage(app.settings.lang, false);
  return true;
}

export async function setLanguage(code: string, persist = true) {
  app.settings.lang = code;
  app.pack = await loadPack(code);
  app.items = buildItems(app.pack);
  app.itemById = new Map(app.items.map((i) => [i.id, i]));
  await loadCards();
  if (persist) await saveSettings();
}

export const loadCards = async () => { app.cards = await getCards(app.settings.lang); };
export const saveSettings = () => kvSet('settings', app.settings);

export const now = () => new Date();
export const plan = (): Plan => planFor(app.pack, now());
export const unlocked = () => (() => { const p = plan(); return unlockedIds(app.pack, p.weekNumber, p.studyDay); })();

/** Items introduced by the schedule that are due now, oldest first. */
export function dueItems(): Item[] {
  const t = Date.now();
  const open = unlocked();
  return [...app.cards.values()]
    .filter((c) => open.has(c.id) && isDue(c, t))
    .sort((a, b) => a.due - b.due)
    .map((c) => app.itemById.get(c.id)!)
    .filter(Boolean);
}

/** Introduced but never studied, in schedule order. */
export function newItems(): Item[] {
  const open = unlocked();
  return app.items.filter((i) => open.has(i.id) && !app.cards.has(i.id));
}

/** Records a grade and schedules the next review. */
export async function grade(item: Item, g: Grade) {
  const t = Date.now();
  const prev = app.cards.get(item.id);
  const state = review(prev ?? newState(t), g, t, { maxIntervalDays: Math.max(1, plan().daysToTrip) });
  const rec: CardRecord = { lang: app.settings.lang, id: item.id, ...state };
  app.cards.set(item.id, rec);
  await putCard(rec);
  await updateLog(app.settings.lang, localDate(now()), (l) => { l.reviews++; });
}

/** Records a drill answer. Right answers on cards that are not due do not move the schedule. */
export async function gradeDrill(item: Item, correct: boolean) {
  const t = Date.now();
  const state = drillReview(app.cards.get(item.id), correct, t, { maxIntervalDays: Math.max(1, plan().daysToTrip) });
  if (state) {
    const rec: CardRecord = { lang: app.settings.lang, id: item.id, ...state };
    app.cards.set(item.id, rec);
    await putCard(rec);
  }
  await updateLog(app.settings.lang, localDate(now()), (l) => { l.reviews++; });
}

export const markTaskDone = (key: string) =>
  updateLog(app.settings.lang, localDate(now()), (l) => { if (!l.done.includes(key)) l.done.push(key); });

export function say(text: string, audioSrc?: string) {
  return speak(text, {
    locale: app.pack.meta.ttsLocale, rate: app.settings.rate, voiceURI: app.settings.voice[app.settings.lang],
    audioSrc, lang: app.settings.lang,
  });
}

export { MASTERED_DAYS };
