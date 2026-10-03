import { addDays, daysBetween, parseLocal } from './dates';
import type { Pack, StudyPlan, Task, Week } from './types';

export type Phase = 'before' | 'rest' | 'active' | 'after';

export interface PlannedTask { task: Task; index: number }

export interface Plan {
  phase: Phase;
  week: Week | null;
  weekNumber: number;       // week used for unlocking content (1 before start, last after the end)
  studyDay: number;         // 1-6: which study day of the week (the rest day is not counted)
  dayIndex: number;         // days since the plan started
  daysToStart: number;
  daysToTrip: number;
  tasks: PlannedTask[];     // today's tasks, with their index in the week (used as the completion key)
}

const planned = (w: Week, day: number | null): PlannedTask[] =>
  w.tasks.map((task, index) => ({ task, index })).filter((p) => day === null || !p.task.days || p.task.days.includes(day));

/** Counts study days (rest day excluded) from the start of the week up to and including `now`. */
function studyDayOf(weekStart: Date, now: Date, restDay: number): number {
  let n = 0;
  for (let d = weekStart; daysBetween(d, now) >= 0; d = addDays(d, 1)) if (d.getDay() !== restDay) n++;
  return Math.max(1, n);
}

/** Maps a date to a study plan. Dates are never stored in the plan: everything counts from `start`, the day it was picked. */
export function planFor(pack: Pack, plan: StudyPlan, start: string, now: Date): Plan {
  const begin = parseLocal(start);
  const trip = parseLocal(pack.meta.trip.date);
  const dayIndex = daysBetween(begin, now);
  const weeks = plan.weeks;
  const base = { dayIndex, daysToStart: -dayIndex, daysToTrip: daysBetween(now, trip) };

  if (dayIndex < 0) return { ...base, phase: 'before', week: weeks[0], weekNumber: 1, studyDay: 1, tasks: planned(weeks[0], 1) };
  const idx = Math.floor(dayIndex / 7);
  if (idx >= weeks.length) {
    const last = weeks[weeks.length - 1];
    return { ...base, phase: 'after', week: last, weekNumber: last.week, studyDay: 6, tasks: [] };
  }
  const week = weeks[idx];
  const studyDay = studyDayOf(addDays(begin, idx * 7), now, pack.meta.restDay);
  const phase: Phase = now.getDay() === pack.meta.restDay ? 'rest' : 'active';
  return { ...base, phase, week, weekNumber: week.week, studyDay, tasks: phase === 'rest' ? [] : planned(week, studyDay) };
}

/**
 * Content introduced so far. Earlier weeks count in full. In the current week, a task's kana group or
 * phrases unlock on the day the task first appears. Reviews and new cards draw only from this set.
 */
export function unlockedIds(pack: Pack, plan: StudyPlan, weekNumber: number, studyDay = 6): Set<string> {
  const ids = new Set<string>();
  const groups = new Map(pack.scripts.systems.flatMap((s) => s.groups).map((g) => [g.id, g]));
  for (const w of plan.weeks) {
    if (w.week > weekNumber) break;
    for (const t of w.tasks) {
      const first = t.days ? Math.min(...t.days) : 1;
      if (w.week === weekNumber && first > studyDay) continue;
      if (t.type === 'kana' && t.ref) groups.get(t.ref)?.chars.forEach((c) => ids.add(c.id));
      t.phraseIds?.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

/** Completion key for a task. The plan id keeps logs from one plan from ticking tasks in another. */
export const taskKey = (planId: string, week: number, index: number) => `${planId}:${week}:${index}`;

/** The task a key points at, if it belongs to this plan. */
export function taskFor(plan: StudyPlan, key: string | null): Task | undefined {
  const [id, week, index] = key?.split(':') ?? [];
  if (id !== plan.id) return undefined;
  return plan.weeks.find((w) => w.week === Number(week))?.tasks[Number(index)];
}
