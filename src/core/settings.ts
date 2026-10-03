/** A chosen study plan. `start` is the local date (YYYY-MM-DD) it was picked. */
export interface PlanChoice { id: string; start: string }

export interface Settings {
  lang: string;
  rate: number;
  voice: Record<string, string>;            // per language voice URI
  plan: Record<string, PlanChoice>;         // per language study plan and the day it started
  direction: 'native-first' | 'english-first';
  keepAwake: boolean;
  newPerSession: number;
  commutePauseMs: number;
}

export const DEFAULTS: Settings = { lang: '', rate: 0.9, voice: {}, plan: {}, direction: 'native-first', keepAwake: true, newPerSession: 5, commutePauseMs: 2500 };

const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** True when every field that is present has the right type and range. Missing fields are fine. */
export function isValidSettings(v: unknown): boolean {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if ('lang' in s && typeof s.lang !== 'string') return false;
  if ('rate' in s && !num(s.rate, 0.1, 3)) return false;
  if ('newPerSession' in s && !num(s.newPerSession, 1, 100)) return false;
  if ('commutePauseMs' in s && !num(s.commutePauseMs, 0, 60_000)) return false;
  if ('keepAwake' in s && typeof s.keepAwake !== 'boolean') return false;
  if ('direction' in s && s.direction !== 'native-first' && s.direction !== 'english-first') return false;
  if ('voice' in s) {
    const voice = s.voice;
    if (typeof voice !== 'object' || voice === null || Array.isArray(voice)) return false;
    if (!Object.values(voice).every((x) => typeof x === 'string')) return false;
  }
  if ('plan' in s) {
    const plan = s.plan;
    if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) return false;
    const ok = (c: unknown) => typeof c === 'object' && c !== null && typeof (c as PlanChoice).id === 'string'
      && typeof (c as PlanChoice).start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test((c as PlanChoice).start);
    if (!Object.values(plan).every(ok)) return false;
  }
  return true;
}

/** Saved settings over the defaults. A saved value that is invalid is ignored, never trusted. */
export function cleanSettings(saved: unknown): Settings {
  return isValidSettings(saved) ? { ...DEFAULTS, ...(saved as Partial<Settings>) } : { ...DEFAULTS };
}
