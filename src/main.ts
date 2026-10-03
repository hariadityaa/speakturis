import './styles/app.css';
import { app, initApp, setLanguage } from './app';
import { h } from './ui/dom';
import { initPwa } from './platform/pwa';
import { route, startRouter } from './router';
import { commuteScreen } from './ui/commute';
import { dialogueScreen } from './ui/dialogue';
import { kanaScreen } from './ui/kana';
import { numbersScreen } from './ui/numbers';
import { practice } from './ui/practice';
import { progressScreen } from './ui/progress';
import { readingScreen } from './ui/reading';
import { settingsScreen } from './ui/settings';
import { buildShell } from './ui/shell';
import { flashScreen, reviewScreen } from './ui/session';
import { today } from './ui/today';

initPwa();

/** First run: blank screen, one question. Picking a language saves it and starts the app. */
function chooseLanguage(mount: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    mount.replaceChildren(h('main', { class: 'welcome' },
      h('h1', null, 'Speakturis'),
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
  const shell = buildShell();
  mount.replaceChildren(shell);
  route('/', today);
  route('/practice', practice);
  route('/review', reviewScreen);
  route('/flash', flashScreen);
  route('/kana', kanaScreen);
  route('/numbers', numbersScreen(false));
  route('/prices', numbersScreen(true));
  route('/read', readingScreen);
  route('/dialogue', dialogueScreen);
  route('/commute', commuteScreen);
  route('/progress', progressScreen);
  route('/settings', settingsScreen);
  await startRouter(shell.querySelector('#main')!);
}

void boot();
