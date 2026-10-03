import { app, dueItems, grade, markTaskDone, newItems, say, studyPlan, unlocked } from '../app';
import { taskFor } from '../core/schedule';
import { shuffle } from '../core/items';
import type { Grade } from '../core/srs';
import type { Item } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, progressBar, type Screen } from './dom';

interface Opts { title: string; back: string; taskKey?: string | null; empty: string }

/** Text-first card session. Front shows text, tap reveals the answer and plays the voice, then grade. */
function runSession(root: HTMLElement, items: Item[], o: Opts) {
  const queue = [...items];
  const total = items.length;
  let done = 0;
  let again = 0;

  const draw = () => {
    root.replaceChildren(header(o.title, o.back));
    if (!queue.length) return finish();
    const item = queue[0];
    // Staff lines are for listening: the card plays first, and the text is the answer.
    const listen = !!item.listen;
    const englishFirst = !listen && item.kind === 'phrase' && app.settings.direction === 'english-first';
    let revealed = false;

    const front = listen ? h('span', null, '🔊', h('small', { class: 'note' }, ' What did they say?')) : englishFirst ? item.english! : item.front;
    const card = h('button', { class: 'flash', 'aria-live': 'polite' },
      h('div', { class: `big${item.kind === 'kana' ? ' huge' : ''}` }, front));
    const back = h('div', { class: 'back-face', hidden: true },
      englishFirst || listen ? h('div', { class: 'big' }, item.front) : null,
      h('div', { class: 'reading' }, item.reading),
      item.english && !englishFirst ? h('div', { class: 'english' }, item.english) : null);
    const grades = h('div', { class: 'grades', hidden: true },
      ([['Again', 0], ['Hard', 1], ['Good', 2], ['Easy', 3]] as [string, Grade][]).map(([label, g]) =>
        h('button', { class: `btn g${g}`, onclick: async () => {
          stopSpeaking();
          await grade(item, g);
          queue.shift();
          if (g === 0) { queue.push(item); again++; } else done++;
          draw();
        } }, label)));
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      back.hidden = false;
      grades.hidden = false;
      hint.hidden = true;
      if (!listen) void say(item.speak, item.audioSrc);
    };
    card.addEventListener('click', reveal);
    const hint = h('p', { class: 'note center' }, 'Tap the card to reveal');
    const speaker = h('button', { class: 'btn ghost', 'aria-label': 'Play audio', onclick: () => void say(item.speak, item.audioSrc) }, '🔊 Play');

    root.append(progressBar(done, total), card, back, hint, h('div', { class: 'stack' }, speaker), grades);
    if (listen) void say(item.speak, item.audioSrc);
  };

  const finish = () => {
    if (o.taskKey) void markTaskDone(o.taskKey);
    root.replaceChildren(header(o.title, o.back),
      h('div', { class: 'card center' }, h('h2', null, 'Done'),
        h('p', null, `${total} card${total === 1 ? '' : 's'} reviewed${again ? `, ${again} repeat${again === 1 ? '' : 's'}` : ''}.`)),
      h('a', { class: 'btn primary', href: '#/' }, 'Back to Today'));
  };

  if (!total) {
    root.append(header(o.title, o.back), h('div', { class: 'card center' }, h('p', null, o.empty)), h('a', { class: 'btn', href: '#/' }, 'Back'));
    return;
  }
  draw();
}

/** Due cards, then a few new ones from the schedule. */
export const reviewScreen: Screen = (root, q) => {
  const due = dueItems();
  const fresh = newItems().slice(0, app.settings.newPerSession);
  runSession(root, [...due, ...fresh], { title: 'Review', back: '/', taskKey: q.get('task'), empty: 'Nothing due. Come back later.' });
  return stopSpeaking;
};

export const flashScreen: Screen = (root, q) => {
  const open = unlocked();
  const tag = q.get('tag');
  const phrases = app.items.filter((i) => i.kind === 'phrase' && open.has(i.id));
  let items: Item[];
  if (q.get('new')) {
    const due = dueItems().filter((i) => i.kind === 'phrase');
    // A schedule task teaches its own phrases, all of them. Otherwise take the next few new ones.
    const ids = taskFor(studyPlan()!, q.get('task'))?.phraseIds;
    const fresh = newItems().filter((i) => i.kind === 'phrase');
    items = [...(ids ? fresh.filter((i) => ids.includes(i.id)) : fresh.slice(0, app.settings.newPerSession)), ...due];
  } else {
    items = phrases.filter((i) => !tag || i.tags?.includes(tag));
    items = shuffle(items).slice(0, 20);
  }

  if (!q.get('new') && !tag && phrases.length) {
    // Picker for situation filter, then start.
    const chips = h('div', { class: 'chips' },
      h('a', { class: 'chip on', href: '#/flash' }, 'All'),
      app.pack.meta.situations.map((s) => h('a', { class: 'chip', href: `#/flash?tag=${s}` }, s)));
    const session = h('div');
    root.append(chips, session);
    runSession(session, items, { title: 'Phrases', back: '/practice', taskKey: q.get('task'), empty: 'No phrases unlocked yet.' });
    return stopSpeaking;
  }
  runSession(root, items, { title: tag ? `Phrases: ${tag}` : q.get('new') ? 'New phrases' : 'Phrases', back: tag ? '/flash' : '/', taskKey: q.get('task'), empty: tag ? `No ${tag} phrases yet.` : 'No phrases unlocked yet. They arrive with the schedule.' });
  return stopSpeaking;
};
