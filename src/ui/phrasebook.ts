import { app, say } from '../app';
import { HEARD, SURVIVAL, bookLists, bookPhrases } from '../core/phrasebook';
import type { Phrase } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

const showLink = (p: Phrase, list: string, from?: string) =>
  `#/show?id=${p.id}&list=${list}${from ? `&from=${from}` : ''}`;
const byId = (id: string | null) => app.pack.phrases.phrases.find((p) => p.id === id);

/** Phrasebook: every phrase, no plan, no grading. Tap one to show it full size. */
export const phrasebookScreen: Screen = (root, q) => {
  const lists = bookLists(app.pack);
  const key = lists.some((l) => l.key === q.get('list')) ? q.get('list')! : lists[0]?.key ?? HEARD;
  const heard = key === HEARD;
  const chips = h('div', { class: 'chips' }, lists.map((l) =>
    h('a', { class: `chip${l.key === key ? ' on' : ''}`, href: `#/phrasebook?list=${l.key}` }, l.label)));
  root.append(
    header('Phrasebook'),
    chips,
    h('p', { class: 'note' }, heard ? 'What staff say to you. Tap one to hear it and see what to say back.' : 'Tap a phrase, then show your phone or press Play.'),
    h('ul', { class: 'list' }, bookPhrases(app.pack, key).map((p) => {
      const reply = heard ? byId(p.replyId ?? null) : undefined;
      return h('li', null, h('a', { class: 'row', href: showLink(p, key) },
        h('span', { class: 'grow' }, h('b', null, p.english), h('small', { class: 'jp sub' }, p.native),
          reply ? h('small', { class: 'sub' }, `Say: ${reply.english}`) : null),
        h('span', { class: 'min', 'aria-hidden': 'true' }, '›')));
    })),
  );
  chips.querySelector('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
};

/** One phrase, as big as it gets, for showing to staff. Prev and Next walk the list it came from. */
export const showScreen: Screen = (root, q) => {
  const list = q.get('list') ?? SURVIVAL;
  const from = q.get('from') ?? undefined;
  const back = from === 'today' ? '/' : `/phrasebook?list=${list}`;
  const p = byId(q.get('id'));
  const label = bookLists(app.pack).find((l) => l.key === list)?.label ?? 'Phrasebook';
  root.append(header(label, back));
  if (!p) { root.append(h('p', { class: 'note' }, 'Phrase not found.')); return; }

  const phrases = bookPhrases(app.pack, list);
  const i = phrases.findIndex((x) => x.id === p.id);
  const step = (d: number) => showLink(phrases[(i + d + phrases.length) % phrases.length], list, from);
  const reply = p.listen ? byId(p.replyId ?? null) : undefined;
  const play = () => void say(p.speak ?? p.native, p.audioSrc);

  root.append(
    h('div', { class: 'flash static show' },
      p.listen ? h('small', { class: 'note' }, 'They said') : null,
      h('div', { class: 'big show-text', lang: app.pack.meta.ttsLocale }, p.native),
      h('div', { class: 'reading' }, p.reading),
      h('div', { class: 'english' }, p.english)),
    h('button', { class: 'btn primary big', onclick: play }, '🔊 Play'),
  );
  if (reply) {
    root.append(h('h2', { class: 'sect' }, 'Say back'),
      h('a', { class: 'row', href: showLink(reply, list, from) },
        h('span', { class: 'grow' }, h('b', { class: 'jp' }, reply.native), h('small', { class: 'sub' }, reply.english)),
        h('span', { class: 'min', 'aria-hidden': 'true' }, '›')));
  }
  if (i >= 0 && phrases.length > 1) {
    root.append(h('div', { class: 'grades two' },
      h('a', { class: 'btn', href: step(-1) }, '‹ Prev'),
      h('a', { class: 'btn', href: step(1) }, 'Next ›')));
  }
  return stopSpeaking;
};

/** Survival phrases pinned on Today. Empty when the pack has none. */
export function survivalGrid(): HTMLElement[] {
  const phrases = bookPhrases(app.pack, SURVIVAL);
  if (!phrases.length) return [];
  return [
    h('h2', { class: 'sect' }, `Survival ${phrases.length}`),
    h('div', { class: 'grid mini' }, phrases.map((p) =>
      h('a', { class: 'tile', href: showLink(p, SURVIVAL, 'today') }, h('b', null, p.english), h('small', { class: 'jp' }, p.native)))),
  ];
}
