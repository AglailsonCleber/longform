import { marginNotesInLine } from "./margin-note";

export const CARD_KEY = "longform-card";
export const PLACE_KEY = "longform-place";
export const WHEN_KEY = "longform-when";

export const CARD_KINDS = ["person", "place", "thing", "world"] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export type CardStatus = "canon" | "hypothesis";
export type CardBasis = "fact" | "invention";

export type Bond = {
  with: string;
  label: string;
  from: string;
  until: string;
};

export type Voice = {
  words: string[];
  never: string[];
};

export type Era = {
  name: string;
  span: string;
};

export type WorldCalendar = {
  weekdays: string[];
  moons: string[];
  eras: Era[];
};

export type Lexicon = {
  tongue: string;
  endings: string[];
  samples: string[];
};

export type BibleCard = {
  path: string;
  project: string;
  kind: CardKind;
  status: CardStatus;
  basis: CardBasis;
  names: string[];
  bonds: Bond[];
  voice: Voice;
  calendar: WorldCalendar | null;
  lexicon: Lexicon | null;
};

export type NameHit = {
  from: number;
  to: number;
  name: string;
  cardPath: string;
};

export type VoiceHit = {
  line: number;
  word: string;
  who: string;
  knownSpeaker: boolean;
};

export type SceneSheet = {
  path: string;
  title: string;
  draft: string;
  text: string;
  place: string;
  when: string;
};

const MIN_NAME = 2;

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => textOf(item)).filter((item) => item.length > 0);
  }
  const single = textOf(value);
  return single.length > 0 ? [single] : [];
}

function kindOf(value: unknown): CardKind | null {
  if (
    value === "person" ||
    value === "place" ||
    value === "thing" ||
    value === "world"
  ) {
    return value;
  }
  return null;
}

function statusOf(value: unknown): CardStatus {
  return value === "canon" ? "canon" : "hypothesis";
}

function basisOf(value: unknown): CardBasis {
  return value === "fact" ? "fact" : "invention";
}

function bondsOf(value: unknown): Bond[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const bonds: Bond[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const other = textOf(record.with);
    if (other.length === 0) {
      continue;
    }
    bonds.push({
      with: other,
      label: textOf(record.label),
      from: textOf(record.from),
      until: textOf(record.until),
    });
  }
  return bonds;
}

function voiceOf(value: unknown): Voice {
  if (!value || typeof value !== "object") {
    return { words: [], never: [] };
  }
  const record = value as Record<string, unknown>;
  return {
    words: stringList(record.words),
    never: stringList(record.never),
  };
}

function calendarOf(value: unknown): WorldCalendar | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const eras: Era[] = [];
  if (Array.isArray(record.eras)) {
    for (const item of record.eras) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const era = item as Record<string, unknown>;
      const name = textOf(era.name);
      if (name.length === 0) {
        continue;
      }
      eras.push({ name, span: textOf(era.span) });
    }
  }
  const calendar = {
    weekdays: stringList(record.weekdays),
    moons: stringList(record.moons),
    eras,
  };
  if (
    calendar.weekdays.length === 0 &&
    calendar.moons.length === 0 &&
    calendar.eras.length === 0
  ) {
    return null;
  }
  return calendar;
}

function lexiconOf(value: unknown): Lexicon | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const lexicon = {
    tongue: textOf(record.tongue),
    endings: stringList(record.endings),
    samples: stringList(record.samples),
  };
  if (
    lexicon.tongue.length === 0 &&
    lexicon.endings.length === 0 &&
    lexicon.samples.length === 0
  ) {
    return null;
  }
  return lexicon;
}

/** A bible card lives beside the Longform block, so a project save does not erase it. */
export function cardFromFrontmatter(
  path: string,
  frontmatter: unknown
): BibleCard | null {
  if (!frontmatter || typeof frontmatter !== "object") {
    return null;
  }
  const raw = (frontmatter as Record<string, unknown>)[CARD_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const kind = kindOf(record.kind);
  const project = textOf(record.project);
  const names = stringList(record.names);
  if (!kind || project.length === 0 || names.length === 0) {
    return null;
  }
  return {
    path,
    project,
    kind,
    status: statusOf(record.status),
    basis: basisOf(record.basis),
    names,
    bonds: bondsOf(record.bonds),
    voice: voiceOf(record.voice),
    calendar: calendarOf(record.calendar),
    lexicon: lexiconOf(record.lexicon),
  };
}

export function cardsForProject(cards: BibleCard[], title: string): BibleCard[] {
  return cards.filter((card) => card.project === title);
}

export function sceneMarkers(frontmatter: unknown): {
  place: string;
  when: string;
} {
  if (!frontmatter || typeof frontmatter !== "object") {
    return { place: "", when: "" };
  }
  const record = frontmatter as Record<string, unknown>;
  return { place: textOf(record[PLACE_KEY]), when: textOf(record[WHEN_KEY]) };
}

function fold(value: string): string {
  return value.toLocaleLowerCase("pt-BR");
}

function isNameChar(ch: string): boolean {
  return /[0-9A-Za-z\u00C0-\u024F_'-]/.test(ch);
}

function blockedRanges(text: string): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (frontmatter && frontmatter.index === 0) {
    ranges.push({ from: 0, to: frontmatter[0].length });
  }
  const notes = /%%[ \t]*\?[\s\S]*?%%/g;
  let match: RegExpExecArray | null;
  while ((match = notes.exec(text))) {
    const from = match.index ?? 0;
    ranges.push({ from, to: from + match[0].length });
  }
  return ranges;
}

function overlaps(
  ranges: { from: number; to: number }[],
  from: number,
  to: number
): boolean {
  return ranges.some((range) => from < range.to && to > range.from);
}

function findWhole(text: string, name: string): { from: number; to: number }[] {
  const needle = fold(name);
  if (needle.length < MIN_NAME) {
    return [];
  }
  const hay = fold(text);
  const spans: { from: number; to: number }[] = [];
  let start = 0;
  while (start < hay.length) {
    const at = hay.indexOf(needle, start);
    if (at < 0) {
      break;
    }
    const before = at === 0 ? "" : text.charAt(at - 1);
    const end = at + name.length;
    const after = end >= text.length ? "" : text.charAt(end);
    if (!isNameChar(before) && !isNameChar(after)) {
      spans.push({ from: at, to: end });
    }
    start = at + needle.length;
  }
  return spans;
}

function namesLongestFirst(cards: BibleCard[]): { name: string; card: BibleCard }[] {
  const named: { name: string; card: BibleCard }[] = [];
  for (const card of cards) {
    for (const raw of card.names) {
      const name = raw.trim();
      if (name.length >= MIN_NAME) {
        named.push({ name, card });
      }
    }
  }
  named.sort((left, right) => right.name.length - left.name.length);
  return named;
}

/** Every alias, longest first, so “Maria José” is not also just “Maria”. */
export function nameHitsInLine(line: string, cards: BibleCard[]): NameHit[] {
  const blocked = marginNotesInLine(line).map((note) => ({
    from: note.from,
    to: note.to,
  }));
  const taken: { from: number; to: number }[] = [];
  const hits: NameHit[] = [];
  for (const candidate of namesLongestFirst(cards)) {
    for (const span of findWhole(line, candidate.name)) {
      if (overlaps(blocked, span.from, span.to) || overlaps(taken, span.from, span.to)) {
        continue;
      }
      taken.push(span);
      hits.push({
        from: span.from,
        to: span.to,
        name: candidate.name,
        cardPath: candidate.card.path,
      });
    }
  }
  hits.sort((left, right) => left.from - right.from);
  return hits;
}

export function replaceWholeName(
  text: string,
  fromName: string,
  toName: string
): { text: string; count: number } {
  const from = fromName.trim();
  const to = toName.trim();
  if (from.length < MIN_NAME || from === to) {
    return { text, count: 0 };
  }
  const blocked = blockedRanges(text);
  const spans = findWhole(text, from).filter(
    (span) => !overlaps(blocked, span.from, span.to)
  );
  if (spans.length === 0) {
    return { text, count: 0 };
  }
  let next = "";
  let cursor = 0;
  for (const span of spans) {
    next += text.slice(cursor, span.from) + to;
    cursor = span.to;
  }
  next += text.slice(cursor);
  return { text: next, count: spans.length };
}

function dialogueSpeech(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("\u2014") || trimmed.startsWith("\u2013");
}

function wordCard(path: string, word: string): BibleCard {
  return {
    path,
    project: "",
    kind: "thing",
    status: "canon",
    basis: "invention",
    names: [word],
    bonds: [],
    voice: { words: [], never: [] },
    calendar: null,
    lexicon: null,
  };
}

/** A word this person would never say, when it shows up in dialogue. */
export function dialogueVoiceHits(text: string, cards: BibleCard[]): VoiceHit[] {
  const people = cards.filter((card) => card.kind === "person");
  const lines = text.split(/\r?\n/);
  const hits: VoiceHit[] = [];
  let previous = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!dialogueSpeech(line)) {
      previous = line;
      continue;
    }
    const named = people.filter(
      (person) =>
        nameHitsInLine(line, [person]).length > 0 ||
        nameHitsInLine(previous, [person]).length > 0
    );
    const knownSpeaker = named.length === 1;
    const pool = knownSpeaker ? named : people;
    for (const person of pool) {
      for (const word of person.voice.never) {
        if (nameHitsInLine(line, [wordCard(person.path, word)]).length === 0) {
          continue;
        }
        hits.push({
          line: index,
          word,
          who: person.names[0],
          knownSpeaker,
        });
      }
    }
    previous = line;
  }
  return hits;
}

export function scenesForPlace(place: BibleCard, scenes: SceneSheet[]): SceneSheet[] {
  const names = new Set(place.names.map((name) => fold(name)));
  return scenes.filter((scene) => {
    if (scene.place.length > 0 && names.has(fold(scene.place))) {
      return true;
    }
    return nameHitsInLine(scene.text, [place]).length > 0 ||
      scene.text.split(/\r?\n/).some((line) => nameHitsInLine(line, [place]).length > 0);
  });
}

export function scenesInEra(era: string, scenes: SceneSheet[]): SceneSheet[] {
  const needle = fold(era.trim());
  if (needle.length === 0) {
    return [];
  }
  return scenes.filter((scene) => fold(scene.when).includes(needle));
}

export function nameSound(
  name: string,
  lexicon: Lexicon | null
): { fits: boolean; detail: string } {
  if (!lexicon || lexicon.endings.length === 0) {
    return { fits: true, detail: "No tongue is set yet." };
  }
  const folded = fold(name.trim());
  const ending = lexicon.endings.find((item) => folded.endsWith(fold(item)));
  const tongue = lexicon.tongue.length > 0 ? lexicon.tongue : "this tongue";
  if (!ending) {
    return { fits: false, detail: `${name} does not end like ${tongue}.` };
  }
  return { fits: true, detail: `${name} ends in “${ending}”, like ${tongue}.` };
}

export function cardFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "Card";
}
