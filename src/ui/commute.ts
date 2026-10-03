import { app, dueItems, markTaskDone, say, unlocked } from '../app';
import { shuffle } from '../core/items';
import { keepAwake, stopSpeaking } from '../platform/tts';
import { h, header, type Screen } from './dom';

/**
 * Commute mode: text-first loop. Shows the phrase and speaks it, waits, reveals the meaning,
 * waits, then moves on. Big controls. Screen stays awake while it runs (speech stops if the
 * screen locks on most phones, so the wake lock is how it keeps going).
 */
export const commuteScreen: Screen = (root, q) => {
  const taskKey = q.get('task');
  const open = unlocked();
  const pool = app.items.filter((i) => i.kind === 'phrase' && open.has(i.id));
  const due = dueItems().filter((i) => i.kind === 'phrase');
  const deck = [...due, ...shuffle(pool.filter((p) => !due.includes(p)))];

  root.append(header('Commute', taskKey ? '/' : '/practice'));
  if (!deck.length) { root.append(h('p', { class: 'note' }, 'No phrases unlocked yet.'), h('a', { class: 'btn', href: '#/' }, 'Back')); return; }

  let idx = 0, playing = false, run = 0, count = 0;
  const front = h('div', { class: 'big' });
  const reading = h('div', { class: 'reading' });
  const english = h('div', { class: 'english' });
  const card = h('div', { class: 'flash static' }, front, reading, english);
  const status = h('p', { class: 'note center' });
  const playBtn = h('button', { class: 'btn primary xl', onclick: () => toggle() }, 'Play');
  root.append(card, status,
    h('div', { class: 'transport' },
      h('button', { class: 'btn xl', 'aria-label': 'Previous', onclick: () => jump(-1) }, '⏮'),
      playBtn,
      h('button', { class: 'btn xl', 'aria-label': 'Next', onclick: () => jump(1) }, '⏭')));

  const wait = (ms: number, id: number) => new Promise<boolean>((res) => setTimeout(() => res(id === run), ms));

  async function loop(id: number) {
    while (id === run) {
      const item = deck[idx % deck.length];
      front.textContent = item.front;
      reading.textContent = '';
      english.textContent = '';
      status.textContent = `${(idx % deck.length) + 1} / ${deck.length}`;
      await say(item.speak, item.audioSrc);
      if (!(await wait(app.settings.commutePauseMs, id))) return;
      reading.textContent = item.reading;
      english.textContent = item.english ?? '';
      if (!(await wait(app.settings.commutePauseMs, id))) return;
      idx++;
      if (++count === 10 && taskKey) void markTaskDone(taskKey);
    }
  }

  function start() {
    playing = true; playBtn.textContent = 'Pause';
    void keepAwake(app.settings.keepAwake);
    void loop(++run);
  }
  function stop() {
    playing = false; playBtn.textContent = 'Play'; run++;
    stopSpeaking();
    void keepAwake(false);
  }
  function toggle() { playing ? stop() : start(); }
  function jump(d: number) {
    idx = (idx + d + deck.length) % deck.length;
    if (playing) { stopSpeaking(); void loop(++run); }
    else { status.textContent = `${idx + 1} / ${deck.length}`; front.textContent = deck[idx].front; reading.textContent = deck[idx].reading; english.textContent = deck[idx].english ?? ''; }
  }

  front.textContent = deck[0].front;
  status.textContent = `1 / ${deck.length}`;
  return stop;
};
