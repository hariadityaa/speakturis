import { describe, expect, it } from 'vitest';
import { DEFAULTS, cleanSettings, isValidSettings } from './settings';

describe('settings', () => {
  it('accepts partial and full valid settings', () => {
    expect(isValidSettings({})).toBe(true);
    expect(isValidSettings({ lang: 'ja', rate: 0.6, voice: { ja: 'x' }, direction: 'english-first', keepAwake: false, newPerSession: 3, commutePauseMs: 1000, plan: { ja: { id: 'week', start: '2026-10-03' } } })).toBe(true);
  });
  it('rejects wrong types and ranges', () => {
    for (const bad of [null, [], 'x', { rate: 'fast' }, { rate: NaN }, { newPerSession: 0 }, { direction: 'up' }, { keepAwake: 1 }, { voice: { ja: 5 } }, { lang: 3 }, { plan: { ja: 'week' } }, { plan: { ja: { id: 'week', start: 'today' } } }]) {
      expect(isValidSettings(bad)).toBe(false);
    }
  });
  it('falls back to defaults for invalid saved values', () => {
    expect(cleanSettings({ rate: 'fast' })).toEqual(DEFAULTS);
    expect(cleanSettings(undefined)).toEqual(DEFAULTS);
    expect(cleanSettings({ lang: 'ja', rate: 0.7 })).toEqual({ ...DEFAULTS, lang: 'ja', rate: 0.7 });
  });
});
