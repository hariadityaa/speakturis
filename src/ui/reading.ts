import { app, say } from '../app';
import { shuffle } from '../core/items';
import { stopSpeaking } from '../platform/tts';
import { h, header, progressBar, type Screen } from './dom';

export const readingScreen: Screen = (root, q) => {
  const setId = q.get('set');
  const sets = app.pack.scripts.systems.flatMap((s) => s.wordSets ?? []);
  const set = sets.find((s) => s.id === setId);

  if (!set) {
    root.append(header('Reading', '/'));
    if (!sets.length) root.append(h('p', { class: 'note' }, 'No reading sets in this pack.'));
    root.append(h('div', { class: 'stack' }, sets.map((s) => h('a', { class: 'btn', href: `#/read?set=${s.id}` }, `${s.label} (${s.words.length})`))));
    return;
  }

  const words = shuffle(set.words);
  let i = 0;
  const body = h('div');
  const step = () => {
    body.replaceChildren();
    if (i >= words.length) {
      body.append(h('div', { class: 'card center' }, h('h2', null, 'Done'), h('p', null, `${words.length} words.`)),
        h('a', { class: 'btn primary', href: '#/read' }, 'Back'));
      return;
    }
    const w = words[i];
    const ans = h('div', { class: 'back-face', hidden: true }, h('div', { class: 'reading' }, w.reading), h('div', { class: 'english' }, w.english));
    const next = h('button', { class: 'btn primary', hidden: true, onclick: () => { i++; step(); } }, 'Next');
    const card = h('button', { class: 'flash', onclick: () => { ans.hidden = false; next.hidden = false; void say(w.speak ?? w.native); } },
      h('div', { class: 'big huge' }, w.native));
    body.append(progressBar(i, words.length), card, ans, h('p', { class: 'note center' }, 'Tap the word to reveal'), next);
  };
  root.append(header(set.label, '/read'), body);
  step();
  return stopSpeaking;
};
