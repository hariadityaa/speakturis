/**
 * Spaced repetition scheduler (a simplified SM-2).
 *
 * The idea in plain words:
 *  - Every card has an "ease" number (how easy you find it) and an "interval" (days until you see it again).
 *  - Each time you grade a card, the interval grows if you remembered it, and resets if you forgot.
 *  - Easy cards grow fast. Hard cards grow slowly. So effort goes where it is needed.
 *
 * Grades:
 *  - Again (0): you forgot. Back to the start. See it again in 10 minutes. Ease drops.
 *  - Hard  (1): you got it with effort. Interval grows only a little. Ease drops a bit.
 *  - Good  (2): normal. First success = 1 day, second = 3 days, after that interval x ease.
 *  - Easy  (3): effortless. Jumps ahead faster. Ease rises.
 *
 * Trip cap: there is a hard end date (the trip). Seeing a card for the first time after the
 * trip is useless, so the interval is capped to `maxIntervalDays` (days left to the trip).
 *
 * Due dates for intervals of 1+ days are set to the start of that local day, so a card that
 * is "due tomorrow" shows up all of tomorrow, including the morning commute.
 */
export type Grade = 0 | 1 | 2 | 3;

export interface SrsState {
  ease: number;      // multiplier, never below MIN_EASE
  interval: number;  // days; 0 means "still learning"
  due: number;       // epoch ms
  reps: number;      // successful reviews in a row
  lapses: number;    // times forgotten
}

export const DAY = 86_400_000;
export const RELEARN_MS = 10 * 60_000;
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;

export const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const newState = (now: number): SrsState => ({
  ease: START_EASE, interval: 0, due: now, reps: 0, lapses: 0,
});

export interface ReviewOptions { maxIntervalDays?: number }

export function review(card: SrsState, grade: Grade, now: number, opts: ReviewOptions = {}): SrsState {
  let { ease, interval, reps, lapses } = card;

  if (grade === 0) {
    // Forgot: restart the ladder and come back soon.
    return { ease: Math.max(MIN_EASE, ease - 0.2), interval: 0, due: now + RELEARN_MS, reps: 0, lapses: lapses + 1 };
  }

  if (grade === 1) {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2));
  } else if (grade === 2) {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
  } else {
    ease += 0.15;
    interval = reps === 0 ? 3 : Math.round(Math.max(interval, 1) * ease * 1.3);
  }
  // Always move forward by at least one day, even if rounding says otherwise.
  interval = Math.max(1, interval);
  if (opts.maxIntervalDays !== undefined) interval = Math.max(1, Math.min(interval, Math.floor(opts.maxIntervalDays)));

  return { ease, interval, due: startOfDay(now) + interval * DAY, reps: reps + 1, lapses };
}

export const isDue = (card: SrsState, now: number): boolean => card.due <= now;

/** "Mastered" means you can go three weeks without seeing it. Used by the progress view. */
export const MASTERED_DAYS = 21;
export const isMastered = (card: SrsState): boolean => card.interval >= MASTERED_DAYS;

/**
 * Drill answers feed the schedule without inflating it. A card that is not due yet keeps its
 * schedule when answered right (returns null). A wrong answer, or a card that is new or due, is graded as usual.
 */
export function drillReview(card: SrsState | undefined, correct: boolean, now: number, opts: ReviewOptions = {}): SrsState | null {
  if (card && !isDue(card, now) && correct) return null;
  return review(card ?? newState(now), correct ? 2 : 0, now, opts);
}
