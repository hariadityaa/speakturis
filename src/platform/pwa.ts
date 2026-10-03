import { registerSW } from 'virtual:pwa-register';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installEvent: InstallEvent | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as InstallEvent; notify(); });
window.addEventListener('appinstalled', () => { installEvent = undefined; notify(); });

export const canInstall = () => !!installEvent;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches;
/** 'unavailable' means Chrome gave no prompt to show, so the user must install from the browser menu. */
export async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = installEvent;
  installEvent = undefined;
  notify();
  if (!e) return 'unavailable';
  try {
    await e.prompt();
    return (await e.userChoice).outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch { return 'unavailable'; }
}

/** Resolves true once Chrome offers install, or false after `ms`. Chrome never offers it when the app is installed. */
export function waitForInstallPrompt(ms: number): Promise<boolean> {
  if (installEvent) return Promise.resolve(true);
  if (!('onbeforeinstallprompt' in window)) return Promise.resolve(false); // Safari, Firefox
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', done); resolve(!!installEvent); };
    const t = setTimeout(done, ms);
    window.addEventListener('beforeinstallprompt', done);
  });
}

let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let needRefresh = false;
export const updateAvailable = () => needRefresh;
/** The first install finished caching, so the app now works offline. */
let offlineReady = false;
export const isOfflineReady = () => offlineReady;
/** The service worker could not start, so offline use will not work. */
let swFailed = false;
export const swRegisterFailed = () => swFailed;
export const applyUpdate = () => updateSW?.(true);
export const onPwaChange = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

export function initPwa() {
  updateSW = registerSW({
    onNeedRefresh() { needRefresh = true; notify(); },
    onOfflineReady() { offlineReady = true; notify(); },
    onRegisterError(e) { console.warn('SW registration failed', e); swFailed = true; notify(); },
  });
}
