import { app } from '../app';
import { MASTERED_DAYS } from '../core/srs';
import { h, header, type Screen } from './dom';

interface Counts { total: number; mastered: number; learning: number }
const bar = (c: Counts) => {
  const pct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
  return h('div', { class: 'stacked', role: 'img', 'aria-label': `${c.mastered} mastered, ${c.learning} learning, ${c.total - c.mastered - c.learning} new` },
    h('span', { class: 'm', style: `width:${pct(c.mastered)}%` }), h('span', { class: 'l', style: `width:${pct(c.learning)}%` }));
};
const count = (ids: string[]): Counts => {
  let mastered = 0, learning = 0;
  for (const id of ids) {
    const c = app.cards.get(id);
    if (!c) continue;
    if (c.interval >= MASTERED_DAYS) mastered++; else learning++;
  }
  return { total: ids.length, mastered, learning };
};
const row = (name: string, c: Counts) =>
  h('li', { class: 'prog' }, h('div', { class: 'ph' }, h('b', null, name), h('small', null, `${c.mastered} mastered · ${c.learning} learning · ${c.total - c.mastered - c.learning} new`)), bar(c));

export const progressScreen: Screen = (root) => {
  const scripts = app.pack.scripts.systems.map((s) => row(s.name, count(s.groups.flatMap((g) => g.chars.map((c) => c.id)))));
  const situations = app.pack.meta.situations.map((s) =>
    row(s, count(app.pack.phrases.phrases.filter((p) => p.tags.includes(s)).map((p) => p.id))));
  root.append(
    header('Progress'),
    h('p', { class: 'note' }, `Mastered = you can go ${MASTERED_DAYS} days without seeing it. Learning = seen, not yet there.`),
    h('h2', { class: 'sect' }, 'Scripts'), h('ul', { class: 'list' }, scripts),
    h('h2', { class: 'sect' }, 'Situations'), h('ul', { class: 'list' }, situations),
  );
};
