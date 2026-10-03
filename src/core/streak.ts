import { addDays, localDate } from './dates';

/**
 * Streak = consecutive days with study. Rules:
 *  - Today is not a miss yet. If you have not studied today, the count runs from yesterday.
 *  - The rest day never breaks a streak and never adds to it.
 *  - Any other empty day ends the streak.
 */
export function streak(activeDates: Set<string>, today: Date, restDay: number): number {
  let count = 0;
  let d = activeDates.has(localDate(today)) ? today : addDays(today, -1);
  for (let guard = 0; guard < 4000; guard++) {
    if (activeDates.has(localDate(d))) count++;
    else if (d.getDay() !== restDay) break;
    d = addDays(d, -1);
  }
  return count;
}
