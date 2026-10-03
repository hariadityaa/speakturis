import { clear, type Screen } from './ui/dom';

const routes = new Map<string, Screen>();
let cleanup: void | (() => void);
let root: HTMLElement;
let renderId = 0;

export const route = (path: string, s: Screen) => routes.set(path, s);
export const go = (path: string) => { location.hash = `#${path}`; };

async function render() {
  const id = ++renderId;
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const screen = routes.get(path) ?? routes.get('/')!;
  if (cleanup) cleanup();
  cleanup = undefined;
  clear(root);
  root.scrollTo?.(0, 0);
  const result = await screen(root, new URLSearchParams(qs));
  if (id === renderId) cleanup = result;
  else if (result) result();
  document.dispatchEvent(new CustomEvent('route', { detail: path }));
}

export function startRouter(el: HTMLElement) {
  root = el;
  window.addEventListener('hashchange', render);
  return render();
}
