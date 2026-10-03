/** Plain-words message for the user. The shell shows it as a toast. */
export function notify(text: string) {
  document.dispatchEvent(new CustomEvent('app-notice', { detail: { text } }));
}

const GENERIC = 'Something went wrong. Please try again. If it keeps happening, close the app and open it again.';

/** Safety net: an error nobody caught still tells the user something. */
export function installErrorNotices() {
  let last = 0;
  const report = (what: unknown) => {
    console.error(what);
    const now = Date.now();
    if (now - last < 5000) return; // one message is enough for a burst
    last = now;
    notify(GENERIC);
  };
  window.addEventListener('unhandledrejection', (e) => report(e.reason));
  window.addEventListener('error', (e) => {
    if (/ResizeObserver/.test(e.message)) return; // harmless browser noise
    report(e.error ?? e.message);
  });
}
