import { app, say } from '../app';
import { ALL, HEARD, bookLists, bookPhrases } from '../core/phrasebook';
import type { Phrase } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

const byId = (id: string | null | undefined) => app.pack.phrases.phrases.find((p) => p.id === id);
/** Only in-app paths are accepted as a back target. */
const safeBack = (b: string | null) => (b?.startsWith('/') && !b.startsWith('//') ? b : undefined);
const showLink = (p: Phrase, list: string, back?: string) =>
  `#/show?id=${p.id}&list=${list}${back ? `&back=${encodeURIComponent(back)}` : ''}`;
const play = (p: Phrase) => void say(p.speak ?? p.native, p.audioSrc);

/**
 * A phrase row. Tap the text to open it full size, or tap 🔊 to hear it.
 * `list` is the list Prev/Next walks on the full-size card; `back` is where that card returns to.
 */
export const phraseRow = (p: Phrase, list: string, back: string) => {
  const reply = p.listen ? byId(p.replyId) : undefined;
  return h('li', { class: 'phrase' },
    h('a', { class: 'grow', href: showLink(p, list, back) },
      h('b', null, p.english),
      h('span', { class: 'answer' }, p.reading),
      h('span', { class: 'script' }, p.native),
      reply ? h('small', { class: 'say' }, `Say back: ${reply.english}`) : null,
      p.listen && !reply ? h('small', { class: 'tag' }, 'You will hear this') : null),
    h('button', { class: 'play', 'aria-label': `Play: ${p.english}`, onclick: () => play(p) }, '🔊'));
};

/** Every phrase, with search and lists: All, Survival, They say, then topics. Useful on the trip itself. */
export const phrasebookScreen: Screen = (root, q) => {
  const lists = [{ key: ALL, label: 'All' }, ...bookLists(app.pack)];
  let key = lists.some((l) => l.key === q.get('list')) ? q.get('list')! : ALL;
  const list = h('div');
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search, e.g. toilet', 'aria-label': 'Search phrases', oninput: () => paint() });
  const chips = h('div', { class: 'chips' });
  const note = h('p', { class: 'note' });

  const paint = () => {
    const words = search.value.trim().toLowerCase();
    const back = `/phrasebook?list=${key}`;
    chips.replaceChildren(...lists.map((l) =>
      h('button', { class: `chip${l.key === key ? ' on' : ''}`, onclick: () => { key = l.key; history.replaceState(null, '', `#${`/phrasebook?list=${key}`}`); paint(); } }, l.label)));
    note.textContent = key === HEARD ? 'What staff say to you, and what to say back.' : 'Tap a phrase to show it full size, or tap 🔊 to hear it.';
    const hit = (p: Phrase) => !words || `${p.english} ${p.reading} ${p.native}`.toLowerCase().includes(words);
    list.replaceChildren();
    if (words || key !== ALL) {
      const found = bookPhrases(app.pack, key).filter(hit);
      list.append(found.length ? h('ul', { class: 'list' }, found.map((p) => phraseRow(p, key, back))) : h('p', { class: 'note' }, 'No phrase found.'));
      return;
    }
    // Everything once: phrases you say under their first topic, then what staff say.
    for (const s of app.pack.meta.situations) {
      const group = app.pack.phrases.phrases.filter((p) => !p.listen && p.tags[0] === s.id);
      if (group.length) list.append(h('h2', { class: 'sect' }, s.label), h('ul', { class: 'list' }, group.map((p) => phraseRow(p, s.id, back))));
    }
    const heard = bookPhrases(app.pack, HEARD);
    if (heard.length) list.append(h('h2', { class: 'sect' }, 'They say'), h('ul', { class: 'list' }, heard.map((p) => phraseRow(p, HEARD, back))));
  };

  root.append(header('Phrasebook'), note, search, chips, list);
  paint();
  chips.querySelector('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  return stopSpeaking;
};

/** One phrase, as big as it gets, for showing to staff. Prev and Next walk the list it came from. */
export const showScreen: Screen = (root, q) => {
  const list = q.get('list') ?? ALL;
  const back = safeBack(q.get('back')) ?? `/phrasebook?list=${list}`;
  const p = byId(q.get('id'));
  const label = [{ key: ALL, label: 'Phrasebook' }, ...bookLists(app.pack)].find((l) => l.key === list)?.label ?? 'Phrasebook';
  root.append(header(label, back));
  if (!p) { root.append(h('p', { class: 'note' }, 'Phrase not found.')); return; }

  const phrases = bookPhrases(app.pack, list);
  const i = phrases.findIndex((x) => x.id === p.id);
  const step = (d: number) => showLink(phrases[(i + d + phrases.length) % phrases.length], list, back);
  const reply = p.listen ? byId(p.replyId) : undefined;

  root.append(
    h('div', { class: 'flash static show' },
      p.listen ? h('small', { class: 'note' }, 'They said') : null,
      h('div', { class: 'big show-text', lang: app.pack.meta.ttsLocale }, p.native),
      h('div', { class: 'answer' }, p.reading),
      h('div', { class: 'english' }, p.english)),
    h('button', { class: 'btn primary big', onclick: () => play(p) }, '🔊 Play'),
  );
  if (reply) {
    root.append(h('h2', { class: 'sect' }, 'Say back'),
      h('a', { class: 'row', href: showLink(reply, list, back) },
        h('span', { class: 'grow' }, h('b', null, reply.english), h('small', null, `${reply.reading} · ${reply.native}`)),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')));
  }
  if (i >= 0 && phrases.length > 1) {
    root.append(h('div', { class: 'grades two' },
      h('a', { class: 'btn', href: step(-1) }, '‹ Previous'),
      h('a', { class: 'btn', href: step(1) }, 'Next ›')));
  }
  return stopSpeaking;
};
