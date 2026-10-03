import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planFor, unlockedIds } from './schedule';
import type { Pack } from './types';

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../content/ja/${f}.json`, import.meta.url), 'utf8'));
const pack = { meta: read('pack'), scripts: read('scripts'), phrases: read('phrases'), numbers: read('numbers'), dialogues: read('dialogues'), schedule: read('schedule') } as Pack;

// Study starts Sat 3 Oct 2026. Rest day is Sunday.
const day = (m: number, d: number) => new Date(2026, m - 1, d, 9, 0);

describe('planFor', () => {
  it('before the start shows week 1 day 1', () => {
    const p = planFor(pack, day(10, 1));
    expect(p.phase).toBe('before');
    expect(p.daysToStart).toBe(2);
    expect(p.weekNumber).toBe(1);
  });

  it('first day is week 1, study day 1', () => {
    const p = planFor(pack, day(10, 3));
    expect([p.phase, p.weekNumber, p.studyDay]).toEqual(['active', 1, 1]);
    expect(p.tasks.some((t) => t.task.ref === 'k-vowels')).toBe(true);
    expect(p.tasks.some((t) => t.task.ref === 'k-k')).toBe(false);
  });

  it('Sunday is a rest day with no tasks and does not count as a study day', () => {
    expect(planFor(pack, day(10, 4)).phase).toBe('rest');
    expect(planFor(pack, day(10, 4)).tasks).toEqual([]);
    expect(planFor(pack, day(10, 5)).studyDay).toBe(2); // Monday
    expect(planFor(pack, day(10, 8)).studyDay).toBe(5); // Thursday
  });

  it('week 2 starts a week after the study start', () => {
    expect(planFor(pack, day(10, 10)).weekNumber).toBe(2);
  });

  it('week 17 is the last; the day after it is "after"', () => {
    expect(planFor(pack, new Date(2027, 0, 29, 9)).weekNumber).toBe(17);
    expect(planFor(pack, new Date(2027, 0, 30, 9)).phase).toBe('after');
    expect(planFor(pack, new Date(2027, 0, 30, 9)).daysToTrip).toBe(0);
  });
});

describe('unlockedIds', () => {
  it('unlocks kana groups on the day their task first appears', () => {
    expect(unlockedIds(pack, 1, 1).has('kata-a')).toBe(true);
    expect(unlockedIds(pack, 1, 1).has('kata-ka')).toBe(false);
    expect(unlockedIds(pack, 1, 2).has('kata-ka')).toBe(true);
  });
  it('earlier weeks stay unlocked and phrases arrive with their week', () => {
    expect(unlockedIds(pack, 2, 1).has('kata-na')).toBe(true);
    expect(unlockedIds(pack, 6, 6).has('p-sumimasen')).toBe(false);
    expect(unlockedIds(pack, 7, 1).has('p-sumimasen')).toBe(true);
    expect(unlockedIds(pack, 7, 1).has('p-konnichiwa')).toBe(false);
  });
});
