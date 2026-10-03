import { app } from '../app';
import { h } from './dom';
import { kvGet, kvSet } from '../platform/db';
import { notify } from '../platform/notice';
import { applyUpdate, isOfflineReady, onPwaChange, swRegisterFailed, updateAvailable } from '../platform/pwa';

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
        h('button', { class: 'btn small', onclick: () => { applyUpdate()?.catch(() => notify('Could not update. Close the app and open it again.')); } }, 'Update')));
    }
  };
  // Problems from any screen. Say what happened, and how to fix it.
  const toast = h('div', { class: 'toast', role: 'status', hidden: true });
  let hide: ReturnType<typeof setTimeout> | undefined;
  const showToast = (text: string) => {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(hide);
    hide = setTimeout(() => { toast.hidden = true; }, 8000);
  };
  document.addEventListener('tts-problem', (e) => {
    const { reason } = (e as CustomEvent<{ reason: string }>).detail;
    showToast(reason === 'unsupported' ? 'This browser cannot play speech. Try Chrome.'
      : reason === 'no-voice' ? `No ${app.pack.meta.name} voice on this device. Install one in Android Settings → System → Languages → Text-to-speech, then reopen the app.`
        : 'Could not play the sound. Check the volume, then try again.');
  });
  document.addEventListener('app-notice', (e) => showToast((e as CustomEvent<{ text: string }>).detail.text));

  // Offline status. The service worker may finish before this shell exists, so check on build and on change.
  let offlineTold = false;
  let swFailTold = false;
  const offlineNotices = () => {
    if (swRegisterFailed() && !swFailTold) {
      swFailTold = true;
      notify('Offline use is not set up yet. Open the app once on Wi-Fi.');
    }
    if (isOfflineReady() && !offlineTold) {
      offlineTold = true;
      // Once per install: remembered in storage. If storage fails, stay quiet rather than repeat.
      void kvGet<boolean>('offlineReadyShown').then(async (shown) => {
        if (shown) return;
        await kvSet('offlineReadyShown', true);
        notify('Ready to use offline.');
      }).catch(() => {});
    }
  };
  onPwaChange(() => { renderBanners(); offlineNotices(); });
  renderBanners();
  offlineNotices();

  return h('div', { class: 'shell' }, banner, main, nav, toast);
}
