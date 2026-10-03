/**
 * Keeps the screen on while a phrase is shown to staff. Browsers drop the lock when the tab
 * is hidden, so it is taken again on return. Returns a function that releases it.
 * Does nothing where the Wake Lock API is missing or refused.
 */
export function keepAwake(): () => void {
  if (!('wakeLock' in navigator)) return () => {};
  let lock: WakeLockSentinel | undefined;
  let on = true;
  const take = async () => {
    if (!on || document.visibilityState !== 'visible') return;
    try { lock = await navigator.wakeLock.request('screen'); } catch { /* refused, e.g. battery saver */ }
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
