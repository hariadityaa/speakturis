import { audioUrl } from '../core/packs';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
let voices: SpeechSynthesisVoice[] = [];

function refresh() { voices = synth?.getVoices() ?? []; }
if (synth) {
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
}

/** Voices can load late (Chrome Android). Resolves once some are available or after a timeout. */
export function voicesReady(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    refresh();
    if (voices.length) return resolve(voices);
    const t = setTimeout(() => resolve(voices), timeoutMs);
    synth.addEventListener('voiceschanged', () => { refresh(); clearTimeout(t); resolve(voices); }, { once: true });
  });
}

const lang2 = (l: string) => l.toLowerCase().replace('_', '-').split('-')[0];

/** Voices for the pack's locale: exact match first, then same language. */
export function matchingVoices(locale: string): SpeechSynthesisVoice[] {
  const norm = (l: string) => l.toLowerCase().replace('_', '-');
  const exact = voices.filter((v) => norm(v.lang) === norm(locale));
  const loose = voices.filter((v) => lang2(v.lang) === lang2(locale) && !exact.includes(v));
  return [...exact, ...loose];
}

export const ttsSupported = !!synth;

export interface SpeakOptions { locale: string; rate: number; voiceURI?: string; audioSrc?: string; lang?: string }

let currentAudio: HTMLAudioElement | undefined;
let token = 0;

export function stopSpeaking() {
  token++;
  synth?.cancel();
  if (currentAudio) { currentAudio.pause(); currentAudio = undefined; }
}

/** Plays a recording if the item has one, otherwise speaks with the device voice. Resolves when finished. */
export function speak(text: string, o: SpeakOptions): Promise<void> {
  stopSpeaking();
  if (o.audioSrc && o.lang) {
    const url = audioUrl(o.lang, o.audioSrc);
    if (url) {
      return new Promise((resolve) => {
        const a = new Audio(url);
        currentAudio = a;
        a.playbackRate = o.rate;
        a.onended = a.onerror = () => resolve();
        a.play().catch(() => resolve());
      });
    }
  }
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = o.locale;
    u.rate = o.rate;
    const list = matchingVoices(o.locale);
    const v = list.find((x) => x.voiceURI === o.voiceURI) ?? list[0];
    if (v) u.voice = v;
    const done = () => resolve();
    u.onend = done;
    u.onerror = done;
    // Chrome sometimes drops onend. Safety timeout scaled to text length.
    setTimeout(done, 3000 + text.length * 400);
    synth.speak(u);
  });
}
