import { app, saveSettings, setLanguage, say } from '../app';
import { exportBackup, importBackup } from '../platform/backup';
import { resetLanguage } from '../platform/db';
import { canInstall, install, isStandalone } from '../platform/pwa';
import { matchingVoices, ttsSupported, voicesReady } from '../platform/tts';
import { h, header, type Screen } from './dom';

export const settingsScreen: Screen = (root) => {
  const s = app.settings;
  const { meta } = app.pack;

  const lang = h('select', { 'aria-label': 'Language', onchange: async (e: Event) => { await setLanguage((e.target as HTMLSelectElement).value); location.hash = '#/'; } },
    app.packs.map((p) => h('option', { value: p.code, selected: p.code === s.lang }, `${p.name} (${p.nativeName})`)));

  const warn = h('div', { class: 'warn', role: 'alert', hidden: true });
  const voice = h('select', { 'aria-label': 'Voice', onchange: (e: Event) => { s.voice[s.lang] = (e.target as HTMLSelectElement).value; void saveSettings(); } },
    h('option', null, 'Loading voices…'));

  /** Voices load late on Android. Draw the page now and fill these in when they arrive. */
  const fillVoices = () => {
    const voices = matchingVoices(meta.ttsLocale);
    const exact = voices.some((v) => v.lang.toLowerCase().replace('_', '-') === meta.ttsLocale.toLowerCase());
    warn.textContent = !ttsSupported
      ? 'This browser has no speech support. Audio will not play.'
      : !voices.length
        ? `No ${meta.name} voice found on this device. Install one in Android Settings → System → Languages → Text-to-speech, then reopen the app.`
        : !exact ? `No ${meta.ttsLocale} voice. Using a ${voices[0].lang} voice instead.` : '';
    warn.hidden = !warn.textContent;
    voice.replaceChildren(...(voices.length
      ? voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === s.voice[s.lang] }, `${v.name} (${v.lang})`))
      : [h('option', null, 'None available')]));
  };

  const rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(s.rate), 'aria-label': 'Speech speed',
    oninput: (e: Event) => { s.rate = Number((e.target as HTMLInputElement).value); rateLabel.textContent = `${s.rate.toFixed(2)}×`; }, onchange: () => void saveSettings() });
  const rateLabel = h('span', null, `${s.rate.toFixed(2)}×`);
  const dir = h('select', { 'aria-label': 'Card front', onchange: (e: Event) => { s.cardFront = (e.target as HTMLSelectElement).value as typeof s.cardFront; void saveSettings(); } },
    h('option', { value: 'english', selected: s.cardFront === 'english' }, 'English (say it)'),
    h('option', { value: 'native', selected: s.cardFront === 'native' }, `${meta.name} (what it means)`));

  const newN = h('select', { 'aria-label': 'New phrases per lesson', onchange: (e: Event) => { s.newPerSession = Number((e.target as HTMLSelectElement).value); void saveSettings(); } },
    [3, 5, 8, 10].map((n) => h('option', { value: n, selected: n === s.newPerSession }, String(n))));

  const msg = h('p', { class: 'note', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async () => {
    const f = file.files?.[0];
    if (!f) return;
    if (!confirm('Importing replaces all progress on this device. Continue?')) return;
    try {
      const r = await importBackup(f);
      msg.textContent = `Restored ${r.cards} phrases.`;
      await setLanguage(s.lang, false);
      location.hash = '#/';
    } catch (e) { msg.textContent = `Import failed: ${(e as Error).message}`; }
  } });

  const field = (label: string, ctl: Node, extra?: Node) => h('label', { class: 'field' }, h('span', null, label), ctl, extra);

  const parts = [
    header('Settings'),
    app.packs.length > 1 ? h('h2', { class: 'sect' }, 'Language') : null, app.packs.length > 1 ? field('Learning', lang) : null,
    h('h2', { class: 'sect' }, 'Audio'),
    warn,
    field('Voice', voice),
    field('Speed', rate, rateLabel),
    h('button', { class: 'btn', onclick: () => void say(app.pack.phrases.phrases[0].speak ?? app.pack.phrases.phrases[0].native) }, '🔊 Test voice'),
    h('h2', { class: 'sect' }, 'Lessons'),
    field('Card front', dir), field('New phrases per lesson', newN),
    h('h2', { class: 'sect' }, 'Backup'),
    h('p', { class: 'note' }, 'Progress lives only on this device. Export a backup now and then.'),
    h('div', { class: 'stack' },
      h('button', { class: 'btn', onclick: () => void exportBackup() }, 'Export backup'),
      h('button', { class: 'btn', onclick: () => file.click() }, 'Import backup'), file),
    msg,
    h('h2', { class: 'sect' }, 'App'),
    !isStandalone() && canInstall() ? h('button', { class: 'btn', onclick: () => void install() }, 'Install app') : null,
    h('p', { class: 'note' }, isStandalone() ? 'Running as installed app.' : canInstall() ? 'Install for full-screen offline use.' : 'Not installable from this browser, or already installed.'),
    h('button', { class: 'btn danger', onclick: async () => {
      if (!confirm(`Erase all ${meta.name} progress on this device? This cannot be undone.`)) return;
      await resetLanguage(s.lang);
      await setLanguage(s.lang, false);
      msg.textContent = 'Progress erased.';
    } }, `Erase ${meta.name} progress`),
  ];
  root.append(...parts.filter((x): x is HTMLElement => !!x));
  void voicesReady(400).then(fillVoices);
};
