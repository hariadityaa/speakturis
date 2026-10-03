import { h } from './dom';
import { applyUpdate, onPwaChange, updateAvailable } from '../platform/pwa';

const tabs: [string, string, string][] = [
  ['/', 'Learn', '◉'], ['/phrasebook', 'Phrasebook', '☰'], ['/settings', 'Settings', '⚙'],
];

export function buildShell(): HTMLElement {
  const banner = h('div', { class: 'banners' });
  const main = h('main', { id: 'main' });
  const nav = h('nav', { class: 'tabs' },
    tabs.map(([p, label, icon]) => h('a', { href: `#${p}`, 'data-path': p }, h('span', { class: 'ico', 'aria-hidden': 'true' }, icon), label)));

  const syncNav = (path: string) => {
    const base = '/' + (path.split('/')[1] ?? '');
    // Lessons, topics and drills all belong to Learn.
    const active = base === '/phrasebook' || base === '/show' ? '/phrasebook' : base === '/settings' ? base : '/';
    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.path === active));
  };
  document.addEventListener('route', (e) => syncNav((e as CustomEvent<string>).detail));

  const renderBanners = () => {
    banner.replaceChildren();
    if (updateAvailable()) {
      banner.append(h('div', { class: 'banner' }, h('span', null, 'Update available'),
        h('button', { class: 'btn small', onclick: () => applyUpdate() }, 'Update')));
    }
  };
  onPwaChange(renderBanners);
  renderBanners();

  return h('div', { class: 'shell' }, banner, main, nav);
}
