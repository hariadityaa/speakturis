import { app, markTaskDone, say } from '../app';
import { shuffle } from '../core/items';
import type { Dialogue, DialogueReply } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

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
  const taskKey = q.get('task');

  if (!d) {
    root.append(header('Role-play', '/practice'),
      h('div', { class: 'stack' }, all.map((x) => h('a', { class: 'btn', href: `#/dialogue?id=${x.id}` }, h('span', null, x.title), h('small', null, ` ${x.situation}`)))));
    return;
  }
  play(root, d, taskKey);
  return stopSpeaking;
};

function play(root: HTMLElement, d: Dialogue, taskKey: string | null) {
  const log = h('div', { class: 'chat', 'aria-live': 'polite' });
  const choicesEl = h('div', { class: 'choices col' });
  let good = 0, turns = 0;
  root.replaceChildren(...[header(d.title, taskKey ? '/' : '/dialogue'), d.intro ? h('p', { class: 'note' }, d.intro) : null, log, choicesEl].filter((x): x is HTMLElement => !!x));

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
      if (taskKey) void markTaskDone(taskKey);
      choicesEl.append(h('div', { class: 'card center' }, h('h2', null, `${good} / ${turns}`), h('p', null, 'good replies')),
        h('button', { class: 'btn primary', onclick: () => play(root, d, taskKey) }, 'Play again'),
        h('a', { class: 'btn', href: taskKey ? '#/' : '#/dialogue' }, 'Done'));
    } else {
      choicesEl.append(...shuffle(node.replies).map((r) => {
        const t = resolve(r);
        return h('button', { class: 'btn choice left', onclick: () => {
          turns++;
          if (r.good) good++;
          log.append(bubble('me', t, r.good ? undefined : (r.feedback ?? 'Not the best reply.')));
          choicesEl.replaceChildren();
          void say(t.speak).then(() => show(r.next));
        } }, h('span', { class: 'jp' }, t.native), h('small', null, t.english));
      }));
    }
    choicesEl.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  };
  show(d.start);
}
