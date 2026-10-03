import './styles/app.css';
import { initApp } from './app';
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

async function boot() {
  const mount = document.getElementById('app')!;
  try {
    await initApp();
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
