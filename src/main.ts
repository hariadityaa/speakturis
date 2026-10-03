import './styles/app.css';
import { app, initApp, setLanguage, studyPlan } from './app';
import { h } from './ui/dom';
import { initPwa } from './platform/pwa';
import { route, startRouter } from './router';
import { commuteScreen } from './ui/commute';
import { dialogueScreen } from './ui/dialogue';
import { kanaScreen } from './ui/kana';
import { numbersScreen } from './ui/numbers';
import { planPicker } from './ui/plans';
import { practice } from './ui/practice';
import { progressScreen } from './ui/progress';
import { readingScreen } from './ui/reading';
import { settingsScreen } from './ui/settings';
import { buildShell } from './ui/shell';
import { flashScreen, reviewScreen } from './ui/session';
import { today } from './ui/today';
import type { Screen } from './ui/dom';

initPwa();

/** First run: blank screen, one question. Picking a language saves it and starts the app. */
function chooseLanguage(mount: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    mount.replaceChildren(h('main', { class: 'welcome' },
      h('h1', null, 'Turisfasih'),
      h('h2', { class: 'sect' }, 'What language do you want to learn?'),
      h('div', { class: 'stack' }, app.packs.map((p) =>
        h('button', { class: 'btn big', onclick: async () => { await setLanguage(p.code); resolve(); } },
          h('span', { class: 'jp' }, p.nativeName), h('small', null, ` ${p.name}`))))));
  });
}

async function boot() {
  const mount = document.getElementById('app')!;
  try {
    if (!(await initApp())) await chooseLanguage(mount);
  } catch (e) {
    mount.textContent = `Failed to load: ${(e as Error).message}`;
    return;
  }
  // Every screen but Settings needs a plan. Without one, show the picker instead.
  const needsPlan = (s: Screen): Screen => (root, q) => (studyPlan() ? s(root, q) : planPicker(root, q));
  const shell = buildShell();
  mount.replaceChildren(shell);
  route('/', needsPlan(today));
  route('/practice', needsPlan(practice));
  route('/review', needsPlan(reviewScreen));
  route('/flash', needsPlan(flashScreen));
  route('/kana', needsPlan(kanaScreen));
  route('/numbers', needsPlan(numbersScreen(false)));
  route('/prices', needsPlan(numbersScreen(true)));
  route('/read', needsPlan(readingScreen));
  route('/dialogue', needsPlan(dialogueScreen));
  route('/commute', needsPlan(commuteScreen));
  route('/progress', needsPlan(progressScreen));
  route('/settings', settingsScreen);
  await startRouter(shell.querySelector('#main')!);
}

void boot();
