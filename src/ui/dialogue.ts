import { app, say, situationLabel } from '../app';
import { shuffle } from '../core/items';
import type { Dialogue, DialogueReply } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

/** Bumped on every start and exit, so a line still being spoken cannot carry on after the screen is left. */
let run = 0;

const resolve = (r: DialogueReply) => {
  const p = r.phraseId ? app.pack.phrases.phrases.find((x) => x.id === r.phraseId) : undefined;
  return {
    native: r.native ?? p!.native, reading: r.reading ?? p!.reading, english: r.english ?? p!.english,
    speak: r.speak ?? p?.speak ?? r.native ?? p!.native,
  };
};

export const dialogueScreen: Screen = (root, q) => {
  const all = app.pack.dialogues.dialogues;
  const d = all.find((x) => x.id === q.get('id'));
  // A topic page links here with its own back target. Only in-app paths are accepted.
  const back = q.get('back')?.startsWith('/') ? q.get('back')! : '/dialogue';

  if (!d) {
    root.append(header('Conversations', '/'),
      h('div', { class: 'stack' }, all.map((x) => h('a', { class: 'btn', href: `#/dialogue?id=${x.id}` }, h('span', null, x.title), h('small', null, ` ${situationLabel(x.situation)}`)))));
    return;
  }
  play(root, d, back);
  return () => { run++; stopSpeaking(); };
};

function play(root: HTMLElement, d: Dialogue, back: string) {
  const log = h('div', { class: 'chat', 'aria-live': 'polite' });
  const choicesEl = h('div', { class: 'choices col' });
  const mine = ++run;
  let good = 0, turns = 0;
  root.replaceChildren(...[header(d.title, back), d.intro ? h('p', { class: 'note' }, d.intro) : null, log, choicesEl].filter((x): x is HTMLElement => !!x));

  const bubble = (who: 'npc' | 'me', n: { native: string; reading: string; english: string; speak?: string }, extra?: string) =>
    h('div', { class: `bubble ${who}` },
      h('button', { class: 'jp', 'aria-label': 'Play', onclick: () => void say(n.speak ?? n.native) }, n.native),
      h('div', { class: 'reading' }, n.reading), h('div', { class: 'english' }, n.english),
      extra ? h('div', { class: 'fb' }, extra) : null);

  const show = (id: string) => {
    const node = d.nodes[id];
    log.append(bubble('npc', node));
    void say(node.speak ?? node.native);
    choicesEl.replaceChildren();
    if (node.end || !node.replies) {
      choicesEl.append(h('div', { class: 'card center' }, h('h2', null, `${good} / ${turns}`), h('p', null, 'good replies')),
        h('button', { class: 'btn primary', onclick: () => play(root, d, back) }, 'Play again'),
        h('a', { class: 'btn', href: `#${back}` }, 'Done'));
    } else {
      choicesEl.append(...shuffle(node.replies).map((r) => {
        const t = resolve(r);
        return h('button', { class: 'btn choice left', onclick: () => {
          turns++;
          if (r.good) good++;
          log.append(bubble('me', t, r.good ? undefined : (r.feedback ?? 'Not the best reply.')));
          choicesEl.replaceChildren();
          void say(t.speak).then(() => { if (mine === run) show(r.next); });
        } }, h('span', { class: 'jp' }, t.native), h('span', { class: 'say-it' }, t.reading), h('small', null, t.english));
      }));
    }
    choicesEl.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  };
  show(d.start);
}
