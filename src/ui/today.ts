import { app, dueItems, newItems, now, plan, studyPlan } from '../app';
import { localDate } from '../core/dates';
import { taskKey } from '../core/schedule';
import { streak } from '../core/streak';
import type { Task } from '../core/types';
import { allLogs, getLog } from '../platform/db';
import { h, header, type Screen } from './dom';

export function taskLink(t: Task, key: string): string {
  const k = `task=${key}`;
  switch (t.type) {
    case 'review': return `/review?${k}`;
    case 'kana': return `/kana?ref=${t.ref ?? 'all'}&${k}`;
    case 'phrases': return `/flash?new=1&${k}`;
    case 'numbers': return `/numbers?${k}`;
    case 'prices': return `/prices?${k}`;
    case 'reading': return `/read?set=${t.ref}&${k}`;
    case 'dialogue': return `/dialogue?id=${t.ref}&${k}`;
    case 'commute': return `/commute?${k}`;
  }
}

const label: Record<Task['type'], string> = {
  review: 'Due reviews', kana: 'Kana', phrases: 'New phrases', numbers: 'Numbers', prices: 'Yen prices',
  reading: 'Reading', dialogue: 'Role-play', commute: 'Commute mode',
};

export const today: Screen = async (root) => {
  const p = plan();
  const sp = studyPlan()!;
  const t = now();
  const log = await getLog(app.settings.lang, localDate(t));
  const active = new Set((await allLogs(app.settings.lang)).filter((l) => l.done.length || l.reviews).map((l) => l.date));
  const s = streak(active, t, app.pack.meta.restDay);
  const due = dueItems().length;
  const fresh = newItems().length;

  root.append(
    header(`${app.pack.meta.nativeName}`),
    h('section', { class: 'hero' },
      h('div', { class: 'stat' }, h('b', null, s), h('small', null, 'day streak')),
      h('div', { class: 'stat' }, h('b', null, due), h('small', null, 'due reviews'))),
  );

  if (due > 0) {
    root.append(h('a', { class: 'btn primary big', href: '#/review' }, `Review ${due} due`));
  }

  if (p.phase === 'before') {
    root.append(h('p', { class: 'note' }, `Study starts in ${p.daysToStart} day${p.daysToStart === 1 ? '' : 's'}. Here is week 1.`));
  } else if (p.phase === 'rest') {
    root.append(h('div', { class: 'card' }, h('h2', null, 'Rest day'), h('p', null, 'No new work today. Reviews are optional.')));
  } else if (p.phase === 'after') {
    root.append(h('p', { class: 'note' }, `${sp.name} plan complete. Keep reviewing until the trip, or start another plan in Settings.`));
  }

  const tasks = p.tasks;
  const refName = (ref?: string) =>
    app.pack.scripts.systems.flatMap((s) => s.groups.map((g) => ({ ...g, sys: s.name })))
      .find((g) => g.id === ref)?.label ?? app.pack.scripts.systems.flatMap((s) => s.wordSets ?? []).find((w) => w.id === ref)?.label
      ?? app.pack.dialogues.dialogues.find((d) => d.id === ref)?.title ?? ref;
  if (p.week && tasks.length) {
    const heading = sp.weeks.length > 1 ? `Week ${p.week.week}: ${p.week.title}` : p.week.title;
    root.append(h('h2', { class: 'sect' }, `${heading} · day ${p.studyDay}`));
    root.append(h('ul', { class: 'list' }, tasks.map(({ task: tk, index: i }) => {
      const key = taskKey(sp.id, p.weekNumber, i);
      const done = log.done.includes(key);
      return h('li', null, h('a', { class: `row${done ? ' done' : ''}`, href: `#${taskLink(tk, key)}` },
        h('span', { class: 'tick', 'aria-hidden': 'true' }, done ? '✓' : '○'),
        h('span', { class: 'grow' }, tk.label ?? label[tk.type], tk.ref ? h('small', null, ` ${refName(tk.ref)}`) : tk.phraseIds ? h('small', null, ` ${tk.phraseIds.length} new`) : null),
        h('span', { class: 'min' }, `${tk.minutes} min`)));
    })));
  }

  const extras = [
    due === 0 && fresh > 0 ? h('a', { class: 'btn', href: '#/review' }, `Learn ${Math.min(fresh, app.settings.newPerSession)} new`) : null,
    h('a', { class: 'btn', href: '#/commute' }, 'Commute mode'),
  ];
  root.append(h('div', { class: 'stack' }, extras));
};
