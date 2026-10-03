import { registerSW } from 'virtual:pwa-register';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installEvent: InstallEvent | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as InstallEvent; notify(); });
window.addEventListener('appinstalled', () => { installEvent = undefined; notify(); });

export const canInstall = () => !!installEvent;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches;
export async function install() { await installEvent?.prompt(); installEvent = undefined; notify(); }

let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let needRefresh = false;
export const updateAvailable = () => needRefresh;
export const applyUpdate = () => updateSW?.(true);
export const onPwaChange = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

export function initPwa() {
  updateSW = registerSW({
    onNeedRefresh() { needRefresh = true; notify(); },
    onRegisterError(e) { console.warn('SW registration failed', e); },
  });
}
