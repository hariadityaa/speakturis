import { describe, expect, it } from 'vitest';
import { DAY, MIN_EASE, RELEARN_MS, START_EASE, drillReview, isDue, isMastered, newState, review, startOfDay } from './srs';

const now = new Date(2026, 9, 5, 8, 30).getTime(); // local 5 Oct 2026, 08:30

describe('srs.review', () => {
  it('Again resets the card, drops ease, and returns in 10 minutes', () => {
    const c = { ...newState(now), interval: 10, reps: 4, ease: 2.5 };
    const r = review(c, 0, now);
    expect(r.interval).toBe(0);
    expect(r.reps).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.ease).toBeCloseTo(2.3);
    expect(r.due).toBe(now + RELEARN_MS);
  });

  it('Good climbs 1 day, 3 days, then interval x ease', () => {
    let c = newState(now);
    c = review(c, 2, now);
    expect(c.interval).toBe(1);
    c = review(c, 2, now);
    expect(c.interval).toBe(3);
    c = review(c, 2, now);
    expect(c.interval).toBe(Math.round(3 * START_EASE)); // 8
  });

  it('due date lands at the start of the local day', () => {
    const c = review(newState(now), 2, now);
    expect(c.due).toBe(startOfDay(now) + DAY);
    expect(isDue(c, now)).toBe(false);
    expect(isDue(c, startOfDay(now) + DAY)).toBe(true);
  });

  it('Hard grows slowly and lowers ease', () => {
    const c = { ...newState(now), interval: 10, reps: 3 };
    const r = review(c, 1, now);
    expect(r.interval).toBe(12);
    expect(r.ease).toBeCloseTo(START_EASE - 0.15);
  });

  it('Hard on a new card still moves at least one day', () => {
    expect(review(newState(now), 1, now).interval).toBe(1);
  });

  it('Easy jumps ahead and raises ease', () => {
    const first = review(newState(now), 3, now);
    expect(first.interval).toBe(3);
    expect(first.ease).toBeCloseTo(START_EASE + 0.15);
    const next = review(first, 3, now);
    expect(next.interval).toBe(Math.round(3 * (START_EASE + 0.30) * 1.3));
  });

  it('ease never drops below the floor', () => {
    let c = newState(now);
    for (let i = 0; i < 20; i++) c = review(c, 0, now);
    expect(c.ease).toBe(MIN_EASE);
  });

  it('caps the interval at maxIntervalDays', () => {
    const c = { ...newState(now), interval: 30, reps: 5 };
    const r = review(c, 2, now, { maxIntervalDays: 12 });
    expect(r.interval).toBe(12);
  });

  it('cap never goes below one day', () => {
    expect(review(newState(now), 2, now, { maxIntervalDays: 0 }).interval).toBe(1);
  });

  it('mastered means a 21 day interval or more', () => {
    expect(isMastered({ ...newState(now), interval: 20 })).toBe(false);
    expect(isMastered({ ...newState(now), interval: 21 })).toBe(true);
  });
});

describe('srs.drillReview', () => {
  it('a right answer on a card that is not due keeps the schedule', () => {
    const c = review(newState(now), 2, now); // due tomorrow
    expect(drillReview(c, true, now)).toBeNull();
  });
  it('repeated right drills the same day do not inflate the interval', () => {
    let c = review(newState(now), 2, now);
    for (let i = 0; i < 20; i++) c = drillReview(c, true, now) ?? c;
    expect(c.interval).toBe(1);
  });
  it('a wrong answer always resets the card', () => {
    const c = review(newState(now), 2, now);
    expect(drillReview(c, false, now)?.interval).toBe(0);
  });
  it('a new or due card is graded as Good', () => {
    expect(drillReview(undefined, true, now)?.interval).toBe(1);
    const due = { ...newState(now), reps: 1, interval: 1, due: now - 1 };
    expect(drillReview(due, true, now)?.interval).toBe(3);
  });
});
