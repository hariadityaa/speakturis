export interface Word { native: string; reading: string; speak?: string }

export interface PackMeta {
  schemaVersion: 1;
  code: string;
  name: string;
  nativeName: string;
  ttsLocale: string;
  readingSystem: string;
  scriptSystems: string[];
  situations: string[];
  currency: { code: string; symbol: string; position: 'prefix' | 'suffix'; decimals: number; unit: Word };
  trip: { date: string; place: string };
  studyStart: string;
  restDay: number;
}

export interface KanaChar { id: string; char: string; reading: string; speak?: string }
export interface KanaGroup { id: string; label: string; chars: KanaChar[] }
export interface ReadingWord { id: string; native: string; reading: string; english: string; speak?: string }
export interface WordSet { id: string; label: string; words: ReadingWord[] }
export interface ScriptSystem { id: string; name: string; groups: KanaGroup[]; wordSets?: WordSet[] }
export interface Scripts { schemaVersion: 1; systems: ScriptSystem[] }

export interface Phrase {
  id: string; native: string; reading: string; english: string; speak?: string;
  tags: string[]; difficulty: 1 | 2 | 3; audioSrc?: string;
}
export interface Phrases { schemaVersion: 1; phrases: Phrase[] }

export interface Multiplier { value: number; native: string; reading: string; speak?: string; omitOne: boolean }
export interface Numbers {
  schemaVersion: 1;
  range: { min: number; max: number };
  words: Record<string, Word>;
  multipliers: Multiplier[];
  overrides?: Record<string, Word>;
  separator: string;
  priceDrill: { min: number; max: number; step: number };
}

export interface DialogueReply {
  phraseId?: string; native?: string; reading?: string; english?: string; speak?: string;
  next: string; good: boolean; feedback?: string;
}
export interface DialogueNode {
  speaker?: 'npc' | 'narrator'; native: string; reading: string; english: string; speak?: string;
  end?: boolean; replies?: DialogueReply[];
}
export interface Dialogue {
  id: string; title: string; situation: string; intro?: string; start: string;
  nodes: Record<string, DialogueNode>;
}
export interface Dialogues { schemaVersion: 1; dialogues: Dialogue[] }

export type TaskType = 'review' | 'kana' | 'phrases' | 'numbers' | 'prices' | 'reading' | 'dialogue' | 'commute';
/** `days` = which study days of the week (1-6, rest day excluded) the task appears on. Omitted = every study day. */
export interface Task { type: TaskType; ref?: string; minutes: number; label?: string; days?: number[] }
export interface Week { week: number; focus: string; title: string; tasks: Task[]; newPhraseIds?: string[] }
export interface Schedule { schemaVersion: 1; dailyMinutes: number; weeks: Week[] }

/** Everything a language pack provides. The engine only ever sees this shape. */
export interface Pack {
  meta: PackMeta;
  scripts: Scripts;
  phrases: Phrases;
  numbers: Numbers;
  dialogues: Dialogues;
  schedule: Schedule;
}

/** One thing that can be reviewed with spaced repetition. */
export interface Item {
  id: string;
  kind: 'kana' | 'phrase';
  front: string;       // what is shown first (text-first)
  reading: string;
  english?: string;
  speak: string;       // what the voice says
  audioSrc?: string;
  system?: string;     // kana: script system id
  tags?: string[];     // phrase: situations
}
