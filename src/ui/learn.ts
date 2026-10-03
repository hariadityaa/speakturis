import { app, isLearned, lessonItems, newItems, phrases, situationLabel } from '../app';
import { h, header, type Screen } from './dom';
import { phraseRow } from './phrasebook';

/** Rough lesson length: a new phrase takes longer than one you have seen. */
const minutes = (due: number, fresh: number) => Math.max(1, Math.round(due * 0.3 + fresh * 0.6));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const meter = (done: number, total: number) =>
  h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': done, 'aria-valuemax': total },
    h('span', { style: `width:${total ? (done / total) * 100 : 0}%` }));

const link = (href: string, title: string, sub: string) =>
  h('li', null, h('a', { class: 'row', href: `#${href}` },
    h('span', { class: 'grow' }, h('b', null, title), h('small', null, sub)), h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')));

/** Home. One button for today's lesson, then topics, then extra practice. */
export const learnScreen: Screen = (root) => {
  const all = phrases();
  const { due, fresh } = lessonItems();
  const learned = all.filter((i) => isLearned(i.id)).length;

  let lesson: HTMLElement;
  if (due.length || fresh.length) {
    const parts = [due.length ? `${due.length} to practise again` : '', fresh.length ? `${fresh.length} new` : ''].filter(Boolean).join(', ');
    lesson = h('section', { class: 'card lesson' },
      h('h2', null, "Today's lesson"),
      h('p', null, `${plural(due.length + fresh.length, 'phrase')} · about ${plural(minutes(due.length, fresh.length), 'minute')}`),
      h('p', { class: 'note' }, parts),
      h('a', { class: 'btn primary big', href: '#/lesson' }, 'Start'));
  } else if (newItems().length) {
    lesson = h('section', { class: 'card lesson' },
      h('h2', null, 'All done for today ✓'),
      h('p', { class: 'note' }, 'Come back tomorrow. Short daily practice sticks best.'),
      h('a', { class: 'btn big', href: '#/lesson?more=1' }, `Learn ${Math.min(newItems().length, app.settings.newPerSession)} more`));
  } else {
    lesson = h('section', { class: 'card lesson' },
      h('h2', null, 'You have learned every phrase ✓'),
      h('p', { class: 'note' }, 'Come back tomorrow to keep them fresh.'));
  }

  const topics = app.pack.meta.situations.map((s) => {
    const ids = all.filter((i) => i.tags?.includes(s.id));
    return link(`/topic?id=${s.id}`, s.label, `${ids.filter((i) => isLearned(i.id)).length} of ${ids.length} learned`);
  });

  const { scripts, dialogues, meta } = app.pack;
  const more = [
    link('/numbers', 'Numbers', 'Hear and say numbers'),
    link('/prices', 'Prices', `Hear and say prices in ${meta.currency.code}`),
    dialogues.dialogues.length ? link('/dialogue', 'Conversations', 'Practise a short conversation') : null,
    scripts.systems.length ? link('/kana', 'Alphabet', scripts.systems.map((s) => s.name).join(', ')) : null,
    scripts.systems.some((s) => s.wordSets?.length) ? link('/read', 'Reading', 'Words on menus and signs') : null,
  ];

  root.append(
    header(`Learn ${meta.name}`),
    lesson,
    h('div', { class: 'overall' }, h('p', null, `You know ${learned} of ${all.length} phrases`), meter(learned, all.length)),
    h('h2', { class: 'sect' }, 'Topics'),
    h('ul', { class: 'list' }, topics),
    h('h2', { class: 'sect' }, 'More practice'),
    h('ul', { class: 'list' }, more),
  );
};

/** One topic: practise it, try its conversation, see its phrases. */
export const topicScreen: Screen = (root, q) => {
  const id = q.get('id') ?? '';
  const items = phrases().filter((i) => i.tags?.includes(id));
  const learned = items.filter((i) => isLearned(i.id)).length;
  const talks = app.pack.dialogues.dialogues.filter((d) => d.situation === id);
  root.append(...[
    header(situationLabel(id), '/'),
    h('section', { class: 'card lesson' },
      h('p', null, `${learned} of ${items.length} learned`), meter(learned, items.length),
      h('a', { class: 'btn primary big', href: `#/lesson?topic=${id}` }, 'Practise this topic'),
    ),
    talks.length ? h('h2', { class: 'sect' }, 'Conversation') : null,
    talks.length ? h('ul', { class: 'list' }, talks.map((d) => link(`/dialogue?id=${d.id}&back=${encodeURIComponent(`/topic?id=${id}`)}`, d.title, 'Practise it as a short role-play'))) : null,
    h('h2', { class: 'sect' }, 'Phrases'),
    h('p', { class: 'note' }, 'Tap a phrase to show it full size, or tap 🔊 to hear it.'),
    h('ul', { class: 'list' }, app.pack.phrases.phrases.filter((p) => p.tags.includes(id)).map((p) => phraseRow(p, id, `/topic?id=${id}`))),
  ].filter((x): x is HTMLElement => !!x));
};
