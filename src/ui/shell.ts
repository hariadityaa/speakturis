import { h } from './dom';
import { applyUpdate, canInstall, install, isStandalone, onPwaChange, updateAvailable } from '../platform/pwa';

const tabs: [string, string, string][] = [
  ['/', 'Today', '◉'], ['/practice', 'Practice', '✎'], ['/progress', 'Progress', '▤'], ['/settings', 'Settings', '⚙'],
];

export function buildShell(): HTMLElement {
  const banner = h('div', { class: 'banners' });
  const main = h('main', { id: 'main' });
  const nav = h('nav', { class: 'tabs' },
    tabs.map(([p, label, icon]) => h('a', { href: `#${p}`, 'data-path': p }, h('span', { class: 'ico', 'aria-hidden': 'true' }, icon), label)));

  const syncNav = (path: string) => {
    const base = '/' + (path.split('/')[1] ?? '');
    const group: Record<string, string> = { '/': '/', '/practice': '/practice', '/progress': '/progress', '/settings': '/settings' };
    const active = group[base] ?? '/practice'; // drills, flashcards, dialogues belong to Practice
    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.path === active));
    nav.hidden = path === '/commute';
  };
  document.addEventListener('route', (e) => syncNav((e as CustomEvent<string>).detail));

  const dismissed = () => { try { return localStorage.getItem('install-dismissed') === '1'; } catch { return false; } };
  const renderBanners = () => {
    banner.replaceChildren();
    if (updateAvailable()) {
      banner.append(h('div', { class: 'banner' }, h('span', null, 'Update available'),
        h('button', { class: 'btn small', onclick: () => applyUpdate() }, 'Update')));
    }
    if (!isStandalone() && canInstall() && !dismissed()) {
      banner.append(h('div', { class: 'banner' }, h('span', null, 'Install for offline use'),
        h('button', { class: 'btn small', onclick: () => install() }, 'Install'),
        h('button', { class: 'btn small ghost', 'aria-label': 'Dismiss', onclick: () => {
          try { localStorage.setItem('install-dismissed', '1'); } catch { /* ignore */ }
          renderBanners();
        } }, '✕')));
    }
  };
  onPwaChange(renderBanners);
  renderBanners();

  return h('div', { class: 'shell' }, banner, main, nav);
}
