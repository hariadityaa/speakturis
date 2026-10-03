/**
 * Keeps the screen on while a phrase is shown to staff. Browsers drop the lock when the tab
 * is hidden, so it is taken again on return. Returns a function that releases it.
 * Where the Wake Lock API is missing or refused, calls `onRefused` so the screen can say so.
 */
export function keepAwake(onRefused?: () => void): () => void {
  if (!('wakeLock' in navigator)) { onRefused?.(); return () => {}; }
  let lock: WakeLockSentinel | undefined;
  let on = true;
  const take = async () => {
    if (!on || document.visibilityState !== 'visible') return;
    try { lock = await navigator.wakeLock.request('screen'); } catch { onRefused?.(); /* e.g. battery saver */ }
    if (!on) void lock?.release();
  };
  const onVisible = () => void take();
  document.addEventListener('visibilitychange', onVisible);
  void take();
  return () => {
    on = false;
    document.removeEventListener('visibilitychange', onVisible);
    void lock?.release();
  };
}
