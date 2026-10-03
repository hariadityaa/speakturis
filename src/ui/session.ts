import { app, grade, lessonItems, newItems, phrases, say, situationLabel } from '../app';
import { shuffle } from '../core/items';
import type { Grade } from '../core/srs';
import type { Item } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, progressBar, type Screen } from './dom';

interface Opts { title: string; back: string; empty: string }

const GRADES: [string, Grade][] = [['Again', 0], ['Hard', 1], ['Good', 2], ['Easy', 3]];

/**
 * Card session. A card you have never studied is taught first: meaning, romaji and voice, no grading.
 * It returns at the end of the queue as a quiz. Quiz cards show a prompt, tap reveals the answer, then you grade.
 */
function runSession(root: HTMLElement, items: Item[], o: Opts) {
  const queue = [...items];
  const total = items.length;
  const taught = new Set<string>();
  let done = 0;
  let again = 0;

  const speaker = (item: Item) => h('button', { class: 'btn ghost', 'aria-label': 'Play audio', onclick: () => void say(item.speak, item.audioSrc) }, '🔊 Play');

  const teach = (item: Item) => {
    const kana = item.kind === 'kana';
    const card = h('div', { class: 'flash static teach' },
      h('span', { class: 'tag' }, item.listen ? 'New · you will hear this' : 'New'),
      kana ? h('div', { class: 'big huge' }, item.front) : h('div', { class: 'big latin' }, item.english ?? item.reading),
      h('div', { class: 'answer' }, item.reading),
      kana ? null : h('div', { class: 'script' }, item.front));
    const hint = h('p', { class: 'note center' }, kana ? 'Listen, then say the sound aloud.' : item.listen ? 'Listen to how it sounds. You will be asked what it means shortly.' : 'Listen, then say it aloud. You will be asked for it shortly.');
    const got = h('button', { class: 'btn primary learn', onclick: () => {
      stopSpeaking();
      taught.add(item.id);
      queue.push(queue.shift()!);
      draw();
    } }, 'Got it');
    root.append(progressBar(done, total), card, hint, h('div', { class: 'stack' }, speaker(item), got));
    void say(item.speak, item.audioSrc);
  };

  const quiz = (item: Item) => {
    // Staff lines are for listening: the card plays first, and the text is the answer.
    const listen = !!item.listen;
    const phrase = item.kind === 'phrase';
    const englishFront = !listen && phrase && app.settings.cardFront === 'english';
    let revealed = false;

    const front = listen ? h('span', null, '🔊', h('small', { class: 'note' }, ' Staff line'))
      : englishFront ? h('div', { class: 'big latin' }, item.english!)
      : h('div', { class: `big${item.kind === 'kana' ? ' huge' : ''}` }, item.front);
    const prompt = listen ? 'What did they say? Tap to check.'
      : englishFront ? 'How do you say this? Say it aloud, then tap to check.'
      : phrase ? 'What does this mean? Tap to check.'
      : 'How is this read? Say it, then tap to check.';
    const card = h('button', { class: 'flash', 'aria-live': 'polite' }, front);
    const back = h('div', { class: 'back-face', hidden: true },
      h('div', { class: 'answer' }, item.reading),
      phrase && !englishFront ? h('div', { class: 'english' }, item.english) : null,
      phrase ? h('div', { class: 'script' }, item.front) : null);
    const grades = h('div', { class: 'grades', hidden: true },
      GRADES.map(([label, g]) =>
        h('button', { class: `btn g${g}`, onclick: async () => {
          stopSpeaking();
          await grade(item, g);
          queue.shift();
          if (g === 0) { queue.push(item); again++; } else done++;
          draw();
        } }, label)));
    const gradeHint = h('p', { class: 'note center', hidden: true }, 'How well did you know it? Again = not at all. Easy = instantly.');
    const hint = h('p', { class: 'note center' }, prompt);
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      back.hidden = false;
      grades.hidden = false;
      gradeHint.hidden = false;
      play.hidden = false;
      hint.hidden = true;
      if (!listen) void say(item.speak, item.audioSrc);
    };
    card.addEventListener('click', reveal);

    // Audio would give away the answer, so it appears with the reveal. Staff lines are audio-first.
    const play = h('div', { class: 'stack', hidden: !listen }, speaker(item));
    root.append(progressBar(done, total), card, back, hint, play, gradeHint, grades);
    if (listen) void say(item.speak, item.audioSrc);
  };

  const draw = () => {
    root.replaceChildren(header(o.title, o.back));
    if (!queue.length) return finish();
    const item = queue[0];
    if (!app.cards.has(item.id) && !taught.has(item.id)) teach(item);
    else quiz(item);
  };

  const finish = () => {
    root.replaceChildren(header(o.title, o.back),
      h('div', { class: 'card center' }, h('h2', null, 'Well done ✓'),
        h('p', null, `You practised ${total} phrase${total === 1 ? '' : 's'}.`),
        again ? h('p', { class: 'note' }, `${again} came back a second time. They will show up again soon.`) : null),
      h('a', { class: 'btn primary big', href: `#${o.back}` }, 'Done'));
  };

  if (!total) {
    root.append(header(o.title, o.back), h('div', { class: 'card center' }, h('p', null, o.empty)), h('a', { class: 'btn', href: `#${o.back}` }, 'Back'));
    return;
  }
  draw();
}

/**
 * A lesson: phrases due again, then a few new ones, most useful first.
 * `?topic=` keeps it to one topic. `?more=1` is new phrases only, after the day's lesson is done.
 */
export const lessonScreen: Screen = (root, q) => {
  const topic = q.get('topic');
  const pool = topic ? phrases().filter((i) => i.tags?.includes(topic)) : phrases();
  let items: Item[];
  if (q.get('more')) items = newItems(pool).slice(0, app.settings.newPerSession);
  else {
    const { due, fresh } = lessonItems(pool, !topic);
    items = [...due, ...fresh];
    // Nothing due or new in this topic: a quick round over what you know.
    if (!items.length && topic) items = shuffle(pool).slice(0, 10);
  }
  const back = topic ? `/topic?id=${topic}` : '/';
  runSession(root, items, { title: topic ? situationLabel(topic) : "Today's lesson", back, empty: 'Nothing to practise right now. Come back tomorrow.' });
  return stopSpeaking;
};
