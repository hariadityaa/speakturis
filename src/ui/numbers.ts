import { app, say } from '../app';
import { shuffle } from '../core/items';
import { composeNumber, composePrice, formatPrice } from '../core/numbers';
import { stopSpeaking } from '../platform/tts';
import { h, header, progressBar, type Screen } from './dom';

const ROUND = 10;
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Shared by the number drill and the yen price drill. Both are driven by numbers.json and pack currency. */
export const numbersScreen = (prices: boolean): Screen => (root) => {
  const { numbers, meta } = app.pack;
  const back = '/';
  const limits = prices
    ? [numbers.priceDrill.max / 10, numbers.priceDrill.max / 2, numbers.priceDrill.max]
    : [10, 100, 1000, numbers.range.max].filter((x) => x <= numbers.range.max);
  let max = limits[Math.min(1, limits.length - 1)];
  let mode: 'say' | 'hear' = 'say';

  const gen = (): number => {
    if (!prices) return rnd(numbers.range.min, max);
    const { min, step } = numbers.priceDrill;
    return rnd(Math.ceil(min / step), Math.floor(max / step)) * step;
  };
  const spoken = (n: number) => (prices ? composePrice(n, numbers, meta.currency.unit) : composeNumber(n, numbers));
  const show = (n: number) => (prices ? formatPrice(n, meta.currency) : n.toLocaleString('en-SG'));

  const body = h('div');
  const bar = h('div', { class: 'chips' });
  const paintBar = () => bar.replaceChildren(
    h('button', { class: `chip${mode === 'say' ? ' on' : ''}`, onclick: () => { mode = 'say'; run(); } }, 'Say it'),
    h('button', { class: `chip${mode === 'hear' ? ' on' : ''}`, onclick: () => { mode = 'hear'; run(); } }, 'Hear it'),
    ...limits.map((l) => h('button', { class: `chip${max === l ? ' on' : ''}`, onclick: () => { max = l; run(); } }, `Up to ${l.toLocaleString('en-SG')}`)));

  const run = () => {
    stopSpeaking();
    paintBar();
    let i = 0, right = 0;
    const step = () => {
      body.replaceChildren();
      if (i >= ROUND) {
        body.append(h('div', { class: 'card center' }, h('h2', null, mode === 'hear' ? `${right} / ${ROUND}` : 'Round complete')),
          h('button', { class: 'btn primary', onclick: run }, 'Another round'), h('a', { class: 'btn', href: `#${back}` }, 'Done'));
        return;
      }
      const n = gen();
      const w = spoken(n);
      if (mode === 'say') {
        const ans = h('div', { class: 'back-face', hidden: true }, h('div', { class: 'big jp' }, w.native), h('div', { class: 'reading' }, w.reading));
        const next = h('div', { class: 'grades two', hidden: true },
          h('button', { class: 'btn g0', onclick: () => { i++; step(); } }, 'Missed'),
          h('button', { class: 'btn g2', onclick: () => { right++; i++; step(); } }, 'Got it'));
        const card = h('button', { class: 'flash', onclick: () => { ans.hidden = false; next.hidden = false; void say(w.speak ?? w.native); } },
          h('div', { class: 'big huge' }, show(n)));
        body.append(progressBar(i, ROUND), card, ans, h('p', { class: 'note center' }, 'Say it aloud, then tap to check.'), next);
      } else {
        // Wrong options sit near the answer so listening, not size, decides it.
        const near = new Set<number>([n]);
        const span = Math.max(2, Math.round(max / 10));
        const unit = prices ? numbers.priceDrill.step : 1;
        const lo = prices ? numbers.priceDrill.min : numbers.range.min;
        const possible = Math.floor((max - lo) / unit) + 1;
        while (near.size < Math.min(4, possible)) near.add(Math.max(lo, Math.min(max, n + rnd(-span, span) * unit)));
        const opts = shuffle([...near]);
        const note = h('p', { class: 'note center', 'aria-live': 'polite' }, ' ');
        const tiles = h('div', { class: 'choices' }, opts.map((o) => h('button', { class: 'btn choice', onclick: (e: MouseEvent) => {
          const ok = o === n;
          tiles.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
          (e.currentTarget as HTMLElement).classList.add(ok ? 'ok' : 'bad');
          if (!ok) tiles.querySelectorAll('button').forEach((b, k) => { if (opts[k] === n) b.classList.add('ok'); });
          if (ok) right++;
          note.textContent = `${show(n)} = ${w.reading}`;
          setTimeout(() => { i++; step(); }, ok ? 800 : 1800);
        } }, show(o))));
        body.append(progressBar(i, ROUND),
          h('button', { class: 'flash', onclick: () => void say(w.speak ?? w.native) }, h('div', { class: 'big' }, '🔊'), h('small', null, 'Tap to hear again')),
          note, tiles);
        void say(w.speak ?? w.native);
      }
    };
    step();
  };

  root.append(header(prices ? 'Prices' : 'Numbers', back), bar, body);
  run();
  return stopSpeaking;
};
