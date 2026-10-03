import { app, phrases, say } from '../app';
import type { Item } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

/** A phrase you can tap to hear. Big enough to show to someone. */
export const phraseRow = (i: Item) =>
  h('li', null, h('button', { class: 'phrase', 'aria-label': `Play: ${i.english}`, onclick: () => void say(i.speak, i.audioSrc) },
    h('span', { class: 'grow' },
      h('b', null, i.english),
      h('span', { class: 'answer' }, i.reading),
      h('span', { class: 'script' }, i.front),
      i.listen ? h('small', { class: 'tag' }, 'You will hear this') : null),
    h('span', { class: 'play', 'aria-hidden': 'true' }, '🔊')));

/** Every phrase by topic, with a search box. Useful on the trip itself. */
export const phrasebookScreen: Screen = (root) => {
  const all = phrases();
  let topic = '';
  const list = h('div');
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search, e.g. toilet', 'aria-label': 'Search phrases', oninput: () => paint() });
  const chips = h('div', { class: 'chips' });

  const paint = () => {
    const words = search.value.trim().toLowerCase();
    chips.replaceChildren(...[{ id: '', label: 'All' }, ...app.pack.meta.situations].map((s) =>
      h('button', { class: `chip${topic === s.id ? ' on' : ''}`, onclick: () => { topic = s.id; paint(); } }, s.label)));
    const hit = (i: Item) => !words || `${i.english} ${i.reading} ${i.front}`.toLowerCase().includes(words);
    list.replaceChildren();
    if (words || topic) {
      const found = all.filter((i) => hit(i) && (!topic || i.tags?.includes(topic)));
      list.append(found.length ? h('ul', { class: 'list phrases' }, found.map(phraseRow)) : h('p', { class: 'note' }, 'No phrase found.'));
      return;
    }
    // Each phrase once, under its first topic.
    for (const s of app.pack.meta.situations) {
      const group = all.filter((i) => i.tags?.[0] === s.id);
      if (group.length) list.append(h('h2', { class: 'sect' }, s.label), h('ul', { class: 'list phrases' }, group.map(phraseRow)));
    }
  };

  root.append(header('Phrasebook'), h('p', { class: 'note' }, 'Tap a phrase to hear it. You can play it to someone.'), search, chips, list);
  paint();
  return stopSpeaking;
};
