import { describe, expect, it } from 'vitest';
import { streak } from './streak';

// 2026-10-07 is a Wednesday. Rest day Sunday (0).
const wed = new Date(2026, 9, 7);
const set = (...d: string[]) => new Set(d);

describe('streak', () => {
  it('is 0 with no activity', () => expect(streak(set(), wed, 0)).toBe(0));
  it('counts today and earlier consecutive days', () =>
    expect(streak(set('2026-10-07', '2026-10-06', '2026-10-05'), wed, 0)).toBe(3));
  it('does not break when today is still empty', () =>
    expect(streak(set('2026-10-06', '2026-10-05'), wed, 0)).toBe(2));
  it('breaks on a missed non-rest day', () =>
    expect(streak(set('2026-10-07', '2026-10-05'), wed, 0)).toBe(1));
  it('skips the rest day without counting it', () =>
    // Mon 5, Sat 3 studied; Sun 4 is rest
    expect(streak(set('2026-10-05', '2026-10-03'), new Date(2026, 9, 5), 0)).toBe(2));
});
