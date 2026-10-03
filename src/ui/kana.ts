import { app, grade, markTaskDone, say, unlocked } from '../app';
import { choices, shuffle } from '../core/items';
import type { Item, KanaChar, KanaGroup } from '../core/types';
import { stopSpeaking } from '../platform/tts';
import { h, header, progressBar, type Screen } from './dom';

const ROUND = 10;

export const kanaScreen: Screen = (root, q) => {
  const ref = q.get('ref');
  const taskKey = q.get('task');
  const groups = app.pack.scripts.systems.flatMap((s) => s.groups.map((g) => ({ sys: s.id, g })));

  if (!ref) {
    // Group picker, grouped by script system in pack order.
    const open = unlocked();
    root.append(header('Kana', '/practice'));
    for (const s of app.pack.scripts.systems) {
      root.append(h('h2', { class: 'sect' }, s.name),
        h('div', { class: 'grid' }, s.groups.map((g) => {
          const live = g.chars.every((c) => open.has(c.id));
          return h('a', { class: `tile${live ? '' : ' dim'}`, href: `#/kana?ref=${g.id}` },
            h('b', { class: 'jp' }, g.chars.map((c) => c.char).join('')), h('small', null, g.label));
        })));
    }
    root.append(h('a', { class: 'btn', href: '#/kana?ref=all' }, 'Drill everything unlocked'));
    return;
  }

  const open = unlocked();
  const found = groups.find((x) => x.g.id === ref);
  let pool: KanaChar[];
  let title: string;
  let distract: KanaChar[];
  if (found) {
    pool = found.g.chars;
    title = found.g.label;
    distract = (app.pack.scripts.systems.find((s) => s.id === found.sys)?.groups ?? []).flatMap((g: KanaGroup) => g.chars);
  } else {
    pool = groups.flatMap((x) => x.g.chars).filter((c) => open.has(c.id));
    title = 'All unlocked';
    distract = pool;
  }

  const back = taskKey ? '/' : '/kana';
  let mode: 'learn' | 'c2s' | 's2c' = 'learn';
  const body = h('div');
  const tabs = h('div', { class: 'chips' });

  const setMode = (m: typeof mode) => { mode = m; stopSpeaking(); paint(); };
  const paintTabs = () => {
    tabs.replaceChildren(...([['learn', 'Learn'], ['c2s', 'Char → sound'], ['s2c', 'Sound → char']] as [typeof mode, string][])
      .map(([m, l]) => h('button', { class: `chip${mode === m ? ' on' : ''}`, onclick: () => setMode(m) }, l)));
  };

  const paint = () => {
    paintTabs();
    body.replaceChildren();
    if (!pool.length) { body.append(h('p', { class: 'note' }, 'Nothing unlocked yet.')); return; }
    if (mode === 'learn') {
      body.append(h('div', { class: 'kana-grid' }, pool.map((c) =>
        h('button', { class: 'kana-cell', onclick: () => void say(c.speak ?? c.char) }, h('b', null, c.char), h('small', null, c.reading)))),
        h('p', { class: 'note center' }, 'Tap a character to hear it.'),
        h('button', { class: 'btn primary', onclick: () => setMode('c2s') }, 'Start drill'));
      return;
    }
    drill(mode);
  };

  const drill = (m: 'c2s' | 's2c') => {
    const qs = shuffle(pool).slice(0, ROUND);
    while (qs.length < Math.min(ROUND, pool.length * 2)) qs.push(...shuffle(pool).slice(0, ROUND - qs.length));
    let i = 0, right = 0;
    const step = () => {
      body.replaceChildren();
      if (i >= qs.length) {
        if (taskKey) void markTaskDone(taskKey);
        body.append(h('div', { class: 'card center' }, h('h2', null, `${right} / ${qs.length}`), h('p', null, 'Round complete.')),
          h('button', { class: 'btn primary', onclick: () => drill(m) }, 'Another round'),
          h('a', { class: 'btn', href: `#${back}` }, 'Done'));
        return;
      }
      const c = qs[i];
      const item = app.itemById.get(c.id) as Item;
      const opts = choices(c, distract, 4, (a, b) => a.id === b.id);
      const answered = h('p', { class: 'note center', 'aria-live': 'polite' }, ' ');
      const prompt = m === 'c2s'
        ? h('div', { class: 'flash static' }, h('div', { class: 'big huge' }, c.char))
        : h('button', { class: 'flash', onclick: () => void say(c.speak ?? c.char) }, h('div', { class: 'big' }, '🔊'), h('small', null, 'Tap to hear again'));
      const tiles = h('div', { class: 'choices' }, opts.map((o) =>
        h('button', { class: `btn choice${m === 's2c' ? ' jp' : ''}`, onclick: async (e: MouseEvent) => {
          const ok = o.id === c.id;
          const btn = e.currentTarget as HTMLButtonElement;
          tiles.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
          btn.classList.add(ok ? 'ok' : 'bad');
          if (!ok) tiles.querySelectorAll('button').forEach((b, k) => { if (opts[k].id === c.id) b.classList.add('ok'); });
          if (ok) right++;
          answered.textContent = ok ? 'Correct' : `${c.char} = ${c.reading}`;
          await grade(item, ok ? 2 : 0);
          setTimeout(() => { i++; step(); }, ok ? 600 : 1400);
        } }, m === 'c2s' ? o.reading : o.char)));
      body.append(progressBar(i, qs.length), prompt, answered, tiles);
      if (m === 's2c') void say(c.speak ?? c.char);
    };
    step();
  };

  root.append(header(title, back), tabs, body);
  paint();
  return stopSpeaking;
};
