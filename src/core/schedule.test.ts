import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planFor, taskFor, taskKey, unlockedIds } from './schedule';
import type { Pack } from './types';

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../content/ja/${f}.json`, import.meta.url), 'utf8'));
const pack = { meta: read('pack'), scripts: read('scripts'), phrases: read('phrases'), numbers: read('numbers'), dialogues: read('dialogues'), schedule: read('schedule') } as Pack;
const week = pack.schedule.plans.find((p) => p.id === 'week')!;
const month = pack.schedule.plans.find((p) => p.id === 'month')!;

// Plans start on Sat 3 Oct 2026, the day they were picked. Rest day is Sunday.
const START = '2026-10-03';
const day = (m: number, d: number) => new Date(2026, m - 1, d, 9, 0);

describe('planFor', () => {
  it('the day before the start shows week 1 day 1', () => {
    const p = planFor(pack, month, START, day(10, 2));
    expect([p.phase, p.daysToStart, p.weekNumber]).toEqual(['before', 1, 1]);
  });

  it('the start day is week 1, study day 1', () => {
    const p = planFor(pack, week, START, day(10, 3));
    expect([p.phase, p.weekNumber, p.studyDay]).toEqual(['active', 1, 1]);
    expect(p.tasks.some((t) => t.task.label === 'Basics')).toBe(true);
    expect(p.tasks.some((t) => t.task.label === 'Food')).toBe(false);
  });

  it('Sunday is a rest day with no tasks and does not count as a study day', () => {
    expect(planFor(pack, month, START, day(10, 4)).phase).toBe('rest');
    expect(planFor(pack, month, START, day(10, 4)).tasks).toEqual([]);
    expect(planFor(pack, month, START, day(10, 5)).studyDay).toBe(2); // Monday
    expect(planFor(pack, month, START, day(10, 8)).studyDay).toBe(5); // Thursday
  });

  it('the 1-week plan ends after 7 days', () => {
    expect(planFor(pack, week, START, day(10, 9)).phase).toBe('active');
    expect(planFor(pack, week, START, day(10, 10)).phase).toBe('after');
    expect(planFor(pack, week, START, day(10, 10)).tasks).toEqual([]);
  });

  it('the 1-month plan runs 4 weeks', () => {
    expect(planFor(pack, month, START, day(10, 10)).weekNumber).toBe(2);
    expect(planFor(pack, month, START, day(10, 30)).weekNumber).toBe(4);
    expect(planFor(pack, month, START, day(10, 31)).phase).toBe('after');
  });

  it('counts down to the trip', () => {
    expect(planFor(pack, week, START, new Date(2027, 0, 29, 9)).daysToTrip).toBe(1);
  });
});

describe('unlockedIds', () => {
  it('unlocks phrases on the day their task first appears', () => {
    expect(unlockedIds(pack, week, 1, 1).has('p-sumimasen')).toBe(true);
    expect(unlockedIds(pack, week, 1, 1).has('p-menyuu')).toBe(false);
    expect(unlockedIds(pack, week, 1, 2).has('p-menyuu')).toBe(true);
  });
  it('earlier weeks stay unlocked', () => {
    expect(unlockedIds(pack, month, 2, 1).has('p-singapore')).toBe(true);
    expect(unlockedIds(pack, month, 1, 6).has('p-menyuu')).toBe(false);
    expect(unlockedIds(pack, month, 4, 6).size).toBe(pack.phrases.phrases.length);
  });
});

describe('taskKey', () => {
  it('resolves only within its own plan', () => {
    const key = taskKey('week', 1, 1);
    expect(taskFor(week, key)?.label).toBe('Basics');
    expect(taskFor(month, key)).toBeUndefined();
    expect(taskFor(week, null)).toBeUndefined();
  });
});
