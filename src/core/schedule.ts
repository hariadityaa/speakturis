import { daysBetween, parseLocal } from './dates';
import type { Pack, Task, Week } from './types';

export type Phase = 'before' | 'rest' | 'active' | 'after';

export interface Plan {
  phase: Phase;
  week: Week | null;
  weekNumber: number;       // week used for unlocking content (1 before start, last after the end)
  dayIndex: number;         // days since study start
  daysToStart: number;
  daysToTrip: number;
  tasks: Task[];
}

/** Maps a date to the schedule. Dates are never stored in the schedule: everything counts from studyStart. */
export function planFor(pack: Pack, now: Date): Plan {
  const start = parseLocal(pack.meta.studyStart);
  const trip = parseLocal(pack.meta.trip.date);
  const dayIndex = daysBetween(start, now);
  const weeks = pack.schedule.weeks;
  const base = { dayIndex, daysToStart: -dayIndex, daysToTrip: daysBetween(now, trip) };

  if (dayIndex < 0) return { ...base, phase: 'before', week: weeks[0], weekNumber: 1, tasks: weeks[0].tasks };
  const idx = Math.floor(dayIndex / 7);
  if (idx >= weeks.length) {
    const last = weeks[weeks.length - 1];
    return { ...base, phase: 'after', week: last, weekNumber: last.week, tasks: last.tasks };
  }
  const week = weeks[idx];
  const phase: Phase = now.getDay() === pack.meta.restDay ? 'rest' : 'active';
  return { ...base, phase, week, weekNumber: week.week, tasks: phase === 'rest' ? [] : week.tasks };
}

/** Content that has been introduced by the given week. Reviews and new cards draw only from this set. */
export function unlockedIds(pack: Pack, weekNumber: number): Set<string> {
  const ids = new Set<string>();
  const groups = new Map(pack.scripts.systems.flatMap((s) => s.groups).map((g) => [g.id, g]));
  for (const w of pack.schedule.weeks) {
    if (w.week > weekNumber) break;
    for (const t of w.tasks) {
      if (t.type === 'kana' && t.ref) groups.get(t.ref)?.chars.forEach((c) => ids.add(c.id));
    }
    w.newPhraseIds?.forEach((id) => ids.add(id));
  }
  return ids;
}

export const taskKey = (week: number, index: number) => `${week}:${index}`;
