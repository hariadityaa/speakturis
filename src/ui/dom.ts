type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { class?: string; onclick?: (e: MouseEvent) => void };

/** Tiny element builder. h('button', {class:'btn', onclick}, 'Label') */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k in el && k !== 'list') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Child) => {
    if (Array.isArray(c)) c.forEach(add);
    else if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  };
  kids.forEach(add);
  return el;
}

export const clear = (el: HTMLElement) => { while (el.firstChild) el.removeChild(el.firstChild); };

export type Screen = (root: HTMLElement, q: URLSearchParams) => void | (() => void) | Promise<void | (() => void)>;

export const header = (title: string, back?: string) =>
  h('header', { class: 'bar' },
    back ? h('a', { class: 'back', href: `#${back}`, 'aria-label': 'Back' }, '‹') : null,
    h('h1', null, title));

export const progressBar = (done: number, total: number) =>
  h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': done, 'aria-valuemax': total },
    h('span', { style: `width:${total ? (done / total) * 100 : 0}%` }));
