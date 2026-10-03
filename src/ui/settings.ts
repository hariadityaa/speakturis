import { app, choosePlan, saveSettings, setLanguage, say, studyPlan } from '../app';
import { exportBackup, importBackup } from '../platform/backup';
import { resetLanguage } from '../platform/db';
import { canInstall, install, isStandalone } from '../platform/pwa';
import { matchingVoices, ttsSupported, voicesReady } from '../platform/tts';
import { h, header, type Screen } from './dom';

export const settingsScreen: Screen = async (root) => {
  const s = app.settings;
  const { meta } = app.pack;
  await voicesReady(400);
  const voices = matchingVoices(meta.ttsLocale);
  const exact = voices.some((v) => v.lang.toLowerCase().replace('_', '-') === meta.ttsLocale.toLowerCase());

  const lang = h('select', { 'aria-label': 'Language', onchange: async (e: Event) => { await setLanguage((e.target as HTMLSelectElement).value); location.hash = '#/'; } },
    app.packs.map((p) => h('option', { value: p.code, selected: p.code === s.lang }, `${p.name} (${p.nativeName})`)));

  const current = studyPlan();
  const planSel = h('select', { 'aria-label': 'Study plan', onchange: async (e: Event) => {
    const el = e.target as HTMLSelectElement;
    if (current && !confirm('Start this plan from today? Your review progress is kept.')) { el.value = current.id; return; }
    await choosePlan(el.value);
    location.hash = '#/';
  } },
    current ? null : h('option', { value: '', selected: true, disabled: true }, 'Choose a plan'),
    app.pack.schedule.plans.map((p) => h('option', { value: p.id, selected: p.id === current?.id }, p.name)));
  const started = current ? h('p', { class: 'note' }, `${current.description} Started ${s.plan[s.lang].start}. Picking a plan restarts it from today.`) : null;

  const warn = !ttsSupported
    ? 'This browser has no speech support. Audio will not play.'
    : !voices.length
      ? `No ${meta.name} voice found on this device. Install one in Android Settings → System → Languages → Text-to-speech, then reopen the app.`
      : !exact ? `No ${meta.ttsLocale} voice. Using a ${voices[0].lang} voice instead.` : '';

  const voice = h('select', { 'aria-label': 'Voice', onchange: (e: Event) => { s.voice[s.lang] = (e.target as HTMLSelectElement).value; void saveSettings(); } },
    voices.length ? voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === s.voice[s.lang] }, `${v.name} (${v.lang})`)) : h('option', null, 'None available'));

  const rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(s.rate), 'aria-label': 'Speech speed',
    oninput: (e: Event) => { s.rate = Number((e.target as HTMLInputElement).value); rateLabel.textContent = `${s.rate.toFixed(2)}×`; }, onchange: () => void saveSettings() });
  const rateLabel = h('span', null, `${s.rate.toFixed(2)}×`);
  const pause = h('input', { type: 'range', min: '1000', max: '6000', step: '500', value: String(s.commutePauseMs), 'aria-label': 'Commute pause',
    oninput: (e: Event) => { s.commutePauseMs = Number((e.target as HTMLInputElement).value); pauseLabel.textContent = `${(s.commutePauseMs / 1000).toFixed(1)} s`; }, onchange: () => void saveSettings() });
  const pauseLabel = h('span', null, `${(s.commutePauseMs / 1000).toFixed(1)} s`);

  const dir = h('select', { 'aria-label': 'Card direction', onchange: (e: Event) => { s.direction = (e.target as HTMLSelectElement).value as typeof s.direction; void saveSettings(); } },
    h('option', { value: 'native-first', selected: s.direction === 'native-first' }, `${meta.name} first`),
    h('option', { value: 'english-first', selected: s.direction === 'english-first' }, 'English first'));

  const awake = h('input', { type: 'checkbox', checked: s.keepAwake, onchange: (e: Event) => { s.keepAwake = (e.target as HTMLInputElement).checked; void saveSettings(); } });
  const newN = h('select', { 'aria-label': 'New cards per session', onchange: (e: Event) => { s.newPerSession = Number((e.target as HTMLSelectElement).value); void saveSettings(); } },
    [3, 5, 8, 10].map((n) => h('option', { value: n, selected: n === s.newPerSession }, String(n))));

  const msg = h('p', { class: 'note', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async () => {
    const f = file.files?.[0];
    if (!f) return;
    if (!confirm('Importing replaces all progress on this device. Continue?')) return;
    try {
      const r = await importBackup(f);
      msg.textContent = `Restored ${r.cards} cards and ${r.days} days.`;
      await setLanguage(s.lang, false);
      location.hash = '#/';
    } catch (e) { msg.textContent = `Import failed: ${(e as Error).message}`; }
  } });

  const field = (label: string, ctl: Node, extra?: Node) => h('label', { class: 'field' }, h('span', null, label), ctl, extra);

  const parts = [
    header('Settings'),
    h('h2', { class: 'sect' }, 'Language'), field('Learning', lang),
    h('h2', { class: 'sect' }, 'Audio'),
    warn ? h('div', { class: 'warn', role: 'alert' }, warn) : null,
    field('Voice', voice),
    field('Speed', rate, rateLabel),
    h('button', { class: 'btn', onclick: () => void say(app.pack.phrases.phrases[0].speak ?? app.pack.phrases.phrases[0].native) }, '🔊 Test voice'),
    h('h2', { class: 'sect' }, 'Study'),
    field('Plan', planSel), started,
    field('Card order', dir), field('New cards per session', newN),
    field('Commute pause', pause, pauseLabel),
    h('label', { class: 'field row' }, h('span', null, 'Keep screen on during commute mode'), awake),
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
      if (!confirm(`Erase all ${meta.name} progress on this device?`)) return;
      await resetLanguage(s.lang);
      await setLanguage(s.lang, false);
      msg.textContent = 'Progress erased.';
    } }, `Reset ${meta.name} progress`),
  ];
  root.append(...parts.filter((x): x is HTMLElement => !!x));
};
