import { app, setLanguage } from '../app';
import { loadPack } from '../core/packs';
import { getCards } from '../platform/db';
import { refresh } from '../router';
import { h } from './dom';

/** "12 of 78 learned" for any pack, read straight from storage so it works for packs not loaded. */
async function progress(code: string): Promise<string> {
  const [pack, cards] = await Promise.all([loadPack(code), getCards(code)]);
  const said = pack.phrases.phrases;
  const learned = said.filter((p) => (cards.get(p.id)?.interval ?? 0) >= 1).length;
  return `${learned} of ${said.length} learned`;
}

/** Bottom sheet listing every language. One tap switches and redraws the current screen. */
function openSheet() {
  const close = () => { sheet.close(); sheet.remove(); };
  const rows = app.packs.map((p) => {
    const sub = h('small', null, p.name);
    void progress(p.code).then((t) => { sub.textContent = `${p.name} · ${t}`; });
    const on = p.code === app.settings.lang;
    return h('li', null, h('button', { class: `row lang-row${on ? ' on' : ''}`, 'aria-current': on ? 'true' : null, onclick: async () => {
      close();
      if (on) return;
      await setLanguage(p.code);
      await refresh();
    } },
      h('span', { class: 'native', 'data-pack': p.code }, p.nativeName),
      h('span', { class: 'grow' }, sub),
      h('span', { class: 'tick', 'aria-hidden': 'true' }, on ? '✓' : '')));
  });
  const sheet = h('dialog', { class: 'sheet', 'aria-label': 'Choose language',
    onclick: (e: MouseEvent) => { if (e.target === sheet) close(); }, onclose: () => sheet.remove() },
    h('div', { class: 'sheet-body' },
      h('h2', { class: 'sect' }, 'Learning'),
      h('ul', { class: 'list' }, rows),
      h('p', { class: 'note' }, 'Each language keeps its own progress.')));
  document.body.append(sheet);
  sheet.showModal();
}

/** Header pill showing the current language. Hidden when there is only one. */
export function langSwitch(): HTMLElement | null {
  if (app.packs.length < 2) return null;
  const { meta } = app.pack;
  return h('button', { class: 'lang-pill', 'aria-label': `Language: ${meta.name}. Change language`, onclick: openSheet },
    h('span', null, meta.name), h('span', { class: 'native' }, meta.nativeName), h('span', { 'aria-hidden': 'true' }, '▾'));
}
