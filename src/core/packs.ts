import type { Pack, PackMeta } from './types';

/**
 * Packs are discovered at build time from /content/<code>/*.json.
 * Adding a folder adds a language. No code change is needed.
 * Vite bundles each JSON into a JS chunk, so the service worker precaches every pack.
 */
const files = import.meta.glob('/content/*/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
const audio = import.meta.glob('/content/*/audio/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const byCode = new Map<string, Map<string, () => Promise<unknown>>>();
for (const [path, loader] of Object.entries(files)) {
  const m = path.match(/^\/content\/([^/]+)\/([^/]+)\.json$/);
  if (!m) continue;
  if (!byCode.has(m[1])) byCode.set(m[1], new Map());
  byCode.get(m[1])!.set(m[2], loader);
}

const cache = new Map<string, Pack>();

export async function listPacks(): Promise<PackMeta[]> {
  const out: PackMeta[] = [];
  for (const [, f] of byCode) {
    const loader = f.get('pack');
    if (loader) out.push((await loader()) as PackMeta);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPack(code: string): Promise<Pack> {
  const hit = cache.get(code);
  if (hit) return hit;
  const f = byCode.get(code);
  if (!f) throw new Error(`Unknown language pack: ${code}`);
  const get = async <T>(name: string) => (await f.get(name)!()) as T;
  const [meta, scripts, phrases, numbers, dialogues, schedule] = await Promise.all([
    get<Pack['meta']>('pack'), get<Pack['scripts']>('scripts'), get<Pack['phrases']>('phrases'),
    get<Pack['numbers']>('numbers'), get<Pack['dialogues']>('dialogues'), get<Pack['schedule']>('schedule'),
  ]);
  const pack: Pack = { meta, scripts, phrases, numbers, dialogues, schedule };
  cache.set(code, pack);
  return pack;
}

/** Resolves a pack-relative audioSrc to a served URL, or undefined if the file is not bundled. */
export function audioUrl(code: string, audioSrc: string): string | undefined {
  return audio[`/content/${code}/${audioSrc}`];
}
