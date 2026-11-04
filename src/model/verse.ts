import { syllablesInWord } from "./archive";

export const STRESS_KEY = "longform-stress";
export const FORM_KIND_KEY = "longform-form-kind";
export const FOLD_STANZA_KEY = "longform-fold-stanza";
export const SOUND_LAYERS_KEY = "longform-sound-layers";

export const SCANSION_MODES = ["classical", "phonetic"] as const;
export type ScansionMode = (typeof SCANSION_MODES)[number];

export const FIXED_FORMS = [
  "sonnet",
  "haiku",
  "villanelle",
  "sestina",
  "redondilha",
  "decima",
  "quatrain",
] as const;
export type FixedForm = (typeof FIXED_FORMS)[number];

export type SoundLayers = {
  alliteration: boolean;
  assonance: boolean;
  echo: boolean;
};

export type LineScan = {
  text: string;
  classical: number;
  phonetic: number;
  rhymeKey: string;
  rhymeLetter: string;
  ending: string;
};

export type FormSlot = {
  index: number;
  rhyme: string;
  syllables: number;
  filled: boolean;
  text: string;
};

export type FormAtlas = {
  kind: FixedForm;
  label: string;
  scheme: string;
  slots: { rhyme: string; syllables: number }[];
};

export type PoemOverview = {
  path: string;
  title: string;
  lines: number;
  stanzas: number;
  form: FixedForm | "";
  scheme: string;
  irregular: boolean;
};

export const DEFAULT_SOUND_LAYERS: SoundLayers = {
  alliteration: false,
  assonance: false,
  echo: false,
};

const RHYME_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function fold(char: string): string {
  return char
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function vowelKind(char: string): "strong" | "weak" | "accented-weak" | "" {
  const raw = char.toLocaleLowerCase("pt-BR");
  if ("íìîúùû".includes(raw)) {
    return "accented-weak";
  }
  if ("áàâãéèêóòôõ".includes(raw)) {
    return "strong";
  }
  const plain = fold(char);
  if (plain === "i" || plain === "u" || plain === "y") {
    return "weak";
  }
  if (plain === "a" || plain === "e" || plain === "o") {
    return "strong";
  }
  return "";
}

/** Elision: final vowel drops before a following initial vowel (phonetic). */
export function elidePair(left: string, right: string): boolean {
  if (!left || !right) {
    return false;
  }
  const end = left.charAt(left.length - 1);
  const start = right.charAt(0);
  return vowelKind(end) !== "" && vowelKind(start) !== "";
}

/**
 * Classical Portuguese meter: diphthong and nasal pair count once;
 * hiatus (accented weak) splits. Syneresis is not forced.
 */
export function classicalSyllables(word: string): number {
  return syllablesInWord(word);
}

/**
 * Phonetic count may join a weak–strong pair across a word boundary (syneresis)
 * and drop a final vowel before the next word (elision).
 */
export function phoneticSyllables(
  words: string[],
  allowSyneresis = true,
  allowElision = true
): number {
  if (words.length === 0) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < words.length; index += 1) {
    let count = classicalSyllables(words[index]);
    if (
      allowElision &&
      index + 1 < words.length &&
      elidePair(words[index], words[index + 1]) &&
      count > 0
    ) {
      count -= 1;
    }
    if (
      allowSyneresis &&
      index > 0 &&
      vowelKind(words[index - 1].charAt(words[index - 1].length - 1)) ===
        "weak" &&
      vowelKind(words[index].charAt(0)) === "strong" &&
      count > 0
    ) {
      // Syneresis already reduced by elision when both fire; avoid double-cutting.
      if (!(allowElision && elidePair(words[index - 1], words[index]))) {
        count -= 1;
      }
    }
    total += Math.max(0, count);
  }
  return total;
}

export function wordsInLine(line: string): string[] {
  const found: string[] = [];
  const pattern = /[0-9A-Za-z\u00C0-\u024F]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    found.push(match[0]);
  }
  return found;
}

/** Ending sound from the last stressed syllable for rhyme matching. */
export function rhymeEnding(word: string, stressOverride = ""): string {
  const override = textOf(stressOverride).toLocaleLowerCase("pt-BR");
  if (override.length > 0) {
    const marked = override.replace(/[^a-záàâãéêíóôõúüç\*'′]/gi, "");
    const star = marked.search(/[\*'′]/);
    if (star >= 0) {
      return fold(marked.slice(star + 1).replace(/[\*'′]/g, ""));
    }
  }
  const plain = fold(word);
  if (plain.length === 0) {
    return "";
  }
  // From the last vowel through the end — mar/lar share "ar".
  let lastVowel = -1;
  for (let index = plain.length - 1; index >= 0; index -= 1) {
    if (vowelKind(plain.charAt(index))) {
      lastVowel = index;
      break;
    }
  }
  if (lastVowel < 0) {
    return plain;
  }
  return plain.slice(lastVowel);
}

export function perfectRhyme(a: string, b: string): boolean {
  return a.length > 0 && a === b;
}

/** Assonance: same vowel skeleton. */
export function assonantRhyme(a: string, b: string): boolean {
  const vowels = (value: string) =>
    value
      .split("")
      .filter((char) => vowelKind(char) !== "")
      .join("");
  const left = vowels(a);
  const right = vowels(b);
  return left.length > 0 && left === right;
}

export function stressMapFromFrontmatter(
  frontmatter: unknown
): Record<string, string> {
  if (!frontmatter || typeof frontmatter !== "object") {
    return {};
  }
  const raw = (frontmatter as Record<string, unknown>)[STRESS_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const map: Record<string, string> = {};
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const value = textOf((raw as Record<string, unknown>)[key]);
    if (value.length > 0) {
      map[fold(key)] = value;
    }
  }
  return map;
}

export function applyStressCorrection(
  map: Record<string, string>,
  word: string,
  marked: string
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const key of Object.keys(map)) {
    next[key] = map[key];
  }
  const folded = fold(word);
  if (textOf(marked).length === 0) {
    delete next[folded];
  } else {
    next[folded] = textOf(marked);
  }
  return next;
}

export function verseLines(text: string): string[] {
  const body = noteBody(text).replace(/\r\n/g, "\n").replace(/\s+$/, "");
  if (body.length === 0) {
    return [];
  }
  return body.split("\n");
}

export function stanzaBlocks(text: string): string[] {
  const body = noteBody(text).replace(/\r\n/g, "\n").trim();
  if (body.length === 0) {
    return [];
  }
  const blocks: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    if (block.trim().length > 0) {
      blocks.push(block);
    }
  }
  return blocks;
}

export function scanPoem(
  text: string,
  stress: Record<string, string> = {}
): LineScan[] {
  const lines = verseLines(text);
  const endingToLetter = new Map<string, string>();
  let letterIndex = 0;
  const scans: LineScan[] = [];
  for (const line of lines) {
    if (line.trim().length === 0) {
      scans.push({
        text: line,
        classical: 0,
        phonetic: 0,
        rhymeKey: "",
        rhymeLetter: "",
        ending: "",
      });
      continue;
    }
    const words = wordsInLine(line);
    let classical = 0;
    for (const word of words) {
      classical += classicalSyllables(word);
    }
    const phonetic = phoneticSyllables(words);
    const last = words[words.length - 1] ?? "";
    const ending = rhymeEnding(last, stress[fold(last)] ?? "");
    let rhymeLetter = "";
    let rhymeKey = ending;
    if (ending.length > 0) {
      let letter = endingToLetter.get(ending);
      if (!letter) {
        // Try assonance family before minting a new letter.
        let found = "";
        endingToLetter.forEach((existingLetter, existingEnding) => {
          if (!found && assonantRhyme(existingEnding, ending)) {
            found = existingLetter.toLocaleLowerCase("pt-BR");
            rhymeKey = existingEnding;
          }
        });
        if (found) {
          letter = found;
        } else {
          letter = RHYME_LETTERS.charAt(letterIndex % RHYME_LETTERS.length);
          letterIndex += 1;
          endingToLetter.set(ending, letter);
        }
      }
      rhymeLetter = letter;
    }
    scans.push({
      text: line,
      classical,
      phonetic,
      rhymeKey,
      rhymeLetter,
      ending,
    });
  }
  return scans;
}

export const FORM_ATLAS: Record<FixedForm, FormAtlas> = {
  sonnet: {
    kind: "sonnet",
    label: "Sonnet",
    scheme: "ABBA ABBA CDC DCD",
    slots: [
      { rhyme: "A", syllables: 10 },
      { rhyme: "B", syllables: 10 },
      { rhyme: "B", syllables: 10 },
      { rhyme: "A", syllables: 10 },
      { rhyme: "A", syllables: 10 },
      { rhyme: "B", syllables: 10 },
      { rhyme: "B", syllables: 10 },
      { rhyme: "A", syllables: 10 },
      { rhyme: "C", syllables: 10 },
      { rhyme: "D", syllables: 10 },
      { rhyme: "C", syllables: 10 },
      { rhyme: "D", syllables: 10 },
      { rhyme: "C", syllables: 10 },
      { rhyme: "D", syllables: 10 },
    ],
  },
  haiku: {
    kind: "haiku",
    label: "Haiku",
    scheme: "—",
    slots: [
      { rhyme: "—", syllables: 5 },
      { rhyme: "—", syllables: 7 },
      { rhyme: "—", syllables: 5 },
    ],
  },
  villanelle: {
    kind: "villanelle",
    label: "Villanelle",
    scheme: "A1bA2 abA1 abA2 abA1 abA2 abA1A2",
    slots: Array.from({ length: 19 }, (_, index) => ({
      rhyme: index % 3 === 2 || index === 0 || index === 18 ? "A" : "b",
      syllables: 10,
    })),
  },
  sestina: {
    kind: "sestina",
    label: "Sestina",
    scheme: "ABCDEF FAEBDC CFDABE ECBFAD DEACFB BDFECA + envoi",
    slots: Array.from({ length: 39 }, () => ({ rhyme: "—", syllables: 10 })),
  },
  redondilha: {
    kind: "redondilha",
    label: "Redondilha",
    scheme: "ABAB",
    slots: [
      { rhyme: "A", syllables: 7 },
      { rhyme: "B", syllables: 7 },
      { rhyme: "A", syllables: 7 },
      { rhyme: "B", syllables: 7 },
    ],
  },
  decima: {
    kind: "decima",
    label: "Décima",
    scheme: "ABBAACCDDC",
    slots: "ABBAACCDDC".split("").map((rhyme) => ({ rhyme, syllables: 8 })),
  },
  quatrain: {
    kind: "quatrain",
    label: "Quatrain",
    scheme: "ABAB",
    slots: [
      { rhyme: "A", syllables: 10 },
      { rhyme: "B", syllables: 10 },
      { rhyme: "A", syllables: 10 },
      { rhyme: "B", syllables: 10 },
    ],
  },
};

export function parseFixedForm(value: unknown): FixedForm | "" {
  const text = textOf(value).toLocaleLowerCase("pt-BR");
  for (const form of FIXED_FORMS) {
    if (form === text || (form === "decima" && text === "décima")) {
      return form;
    }
  }
  return "";
}

/** Blank scaffold: one placeholder line per slot with rhyme letter and syllable quota. */
export function formScaffold(kind: FixedForm): string {
  const atlas = FORM_ATLAS[kind];
  const lines: string[] = [];
  let stanzaBreak = 0;
  for (let index = 0; index < atlas.slots.length; index += 1) {
    const slot = atlas.slots[index];
    lines.push(`[${slot.rhyme} · ${slot.syllables}]`);
    stanzaBreak += 1;
    if (kind === "sonnet" && (stanzaBreak === 4 || stanzaBreak === 8 || stanzaBreak === 11)) {
      lines.push("");
    }
    if (kind === "redondilha" && stanzaBreak === 4) {
      lines.push("");
      stanzaBreak = 0;
    }
    if (kind === "quatrain" && stanzaBreak === 4) {
      lines.push("");
      stanzaBreak = 0;
    }
  }
  return lines.join("\n").replace(/\n+$/, "") + "\n";
}

export function formProgress(text: string, kind: FixedForm): FormSlot[] {
  const atlas = FORM_ATLAS[kind];
  const lines = verseLines(text).filter((line) => line.trim().length > 0);
  return atlas.slots.map((slot, index) => {
    const line = lines[index] ?? "";
    const filled = line.length > 0 && !/^\[[^\]]+\]\s*$/.test(line.trim());
    return {
      index: index + 1,
      rhyme: slot.rhyme,
      syllables: slot.syllables,
      filled,
      text: line,
    };
  });
}

export function formGaps(slots: FormSlot[]): number {
  let gaps = 0;
  for (const slot of slots) {
    if (!slot.filled) {
      gaps += 1;
    }
  }
  return gaps;
}

export function soundHits(
  text: string,
  layers: SoundLayers
): { kind: "alliteration" | "assonance" | "echo"; word: string; index: number }[] {
  const hits: {
    kind: "alliteration" | "assonance" | "echo";
    word: string;
    index: number;
  }[] = [];
  if (!layers.alliteration && !layers.assonance && !layers.echo) {
    return hits;
  }
  const words = wordsInLine(noteBody(text).replace(/\n/g, " "));
  const initialCount = new Map<string, number>();
  const vowelCount = new Map<string, number>();
  const wholeCount = new Map<string, number>();
  for (const word of words) {
    const folded = fold(word);
    if (folded.length === 0) {
      continue;
    }
    initialCount.set(folded.charAt(0), (initialCount.get(folded.charAt(0)) ?? 0) + 1);
    const vowels = folded
      .split("")
      .filter((char) => vowelKind(char) !== "")
      .join("");
    if (vowels.length > 0) {
      vowelCount.set(vowels, (vowelCount.get(vowels) ?? 0) + 1);
    }
    wholeCount.set(folded, (wholeCount.get(folded) ?? 0) + 1);
  }
  words.forEach((word, index) => {
    const folded = fold(word);
    if (layers.alliteration && (initialCount.get(folded.charAt(0)) ?? 0) >= 3) {
      hits.push({ kind: "alliteration", word, index });
    }
    const vowels = folded
      .split("")
      .filter((char) => vowelKind(char) !== "")
      .join("");
    if (layers.assonance && vowels.length > 0 && (vowelCount.get(vowels) ?? 0) >= 3) {
      hits.push({ kind: "assonance", word, index });
    }
    if (layers.echo && (wholeCount.get(folded) ?? 0) >= 2) {
      hits.push({ kind: "echo", word, index });
    }
  });
  return hits;
}

export type RhymeEntry = {
  word: string;
  ending: string;
  syllables: number;
  kind: "perfect" | "assonant";
};

/** Rhyme dictionary from pronunciation, filterable by syllable count. */
export function rhymeDictionary(
  corpus: string,
  seed: string,
  syllableFilter = 0,
  stress: Record<string, string> = {}
): RhymeEntry[] {
  const seedEnding = rhymeEnding(seed, stress[fold(seed)] ?? "");
  if (!seedEnding) {
    return [];
  }
  const seen = new Set<string>();
  const entries: RhymeEntry[] = [];
  for (const word of wordsInLine(corpus.replace(/\n/g, " "))) {
    const folded = fold(word);
    if (folded === fold(seed) || seen.has(folded)) {
      continue;
    }
    seen.add(folded);
    const ending = rhymeEnding(word, stress[folded] ?? "");
    const syllables = classicalSyllables(word);
    if (syllableFilter > 0 && syllables !== syllableFilter) {
      continue;
    }
    if (perfectRhyme(ending, seedEnding)) {
      entries.push({ word, ending, syllables, kind: "perfect" });
    } else if (assonantRhyme(ending, seedEnding)) {
      entries.push({ word, ending, syllables, kind: "assonant" });
    }
  }
  entries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "perfect" ? -1 : 1;
    }
    return left.word.localeCompare(right.word, "pt-BR");
  });
  return entries;
}

export function collectionOverview(
  poems: { path: string; title: string; text: string; form?: FixedForm | "" }[]
): PoemOverview[] {
  return poems.map((poem) => {
    const scans = scanPoem(poem.text);
    const contentLines = scans.filter((line) => line.text.trim().length > 0);
    const scheme = contentLines
      .map((line) => line.rhymeLetter || "—")
      .join("");
    const form = poem.form ?? "";
    let irregular = false;
    if (form) {
      const slots = formProgress(poem.text, form);
      irregular = formGaps(slots) > 0;
      const expected = FORM_ATLAS[form].slots.length;
      if (contentLines.length !== expected) {
        irregular = true;
      }
    }
    return {
      path: poem.path,
      title: poem.title,
      lines: contentLines.length,
      stanzas: stanzaBlocks(poem.text).length,
      form,
      scheme,
      irregular,
    };
  });
}

export function soundLayersFromFrontmatter(frontmatter: unknown): SoundLayers {
  if (!frontmatter || typeof frontmatter !== "object") {
    return { ...DEFAULT_SOUND_LAYERS };
  }
  const raw = (frontmatter as Record<string, unknown>)[SOUND_LAYERS_KEY];
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SOUND_LAYERS };
  }
  const record = raw as Record<string, unknown>;
  return {
    alliteration: record.alliteration === true,
    assonance: record.assonance === true,
    echo: record.echo === true,
  };
}

export function foldStanzaIndex(frontmatter: unknown): number {
  if (!frontmatter || typeof frontmatter !== "object") {
    return 0;
  }
  const value = Number((frontmatter as Record<string, unknown>)[FOLD_STANZA_KEY]);
  return value > 0 ? Math.floor(value) : 0;
}
