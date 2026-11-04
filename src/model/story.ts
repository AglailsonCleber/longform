import { readingMinutes } from "./habit";
import { CEILING_KEY } from "./architecture";

export const LENGTH_KIND_KEY = "longform-length-kind";
export const FLOOR_KEY = "longform-floor";
export const PIN_OPEN_KEY = "longform-pin-open";
export const PIN_CLOSE_KEY = "longform-pin-close";
export const REVEALED_KEY = "longform-revealed";
export const SECRET_KEY = "longform-secret";
export const EFFECT_KEY = "longform-effect";
export const MOTIFS_KEY = "longform-motifs";
export const MOTIF_KEY = "longform-motif";

export const LENGTH_KINDS = ["micro", "flash", "story", "novelette"] as const;
export type LengthKind = (typeof LENGTH_KINDS)[number];

/** Default floor and ceiling in words for each short-story length. */
export const LENGTH_BOUNDS: Record<LengthKind, { floor: number; ceiling: number }> = {
  micro: { floor: 1, ceiling: 100 },
  flash: { floor: 100, ceiling: 1000 },
  story: { floor: 1000, ceiling: 7500 },
  novelette: { floor: 7500, ceiling: 20000 },
};

export type StorySheet = {
  lengthKind: LengthKind | "";
  floor: number;
  ceiling: number;
  pinOpen: string;
  pinClose: string;
  revealed: string[];
  secret: string[];
  effect: string;
  motifs: string[];
};

export type MotifSighting = {
  motif: string;
  path: string;
  title: string;
  count: number;
};

export type LengthStatus = {
  words: number;
  floor: number;
  ceiling: number;
  belowFloor: boolean;
  overCeiling: boolean;
  kind: LengthKind | "";
};

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOf(value: unknown): number {
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") {
    const parts: string[] = [];
    for (const part of value.split(/[\n,]/)) {
      const item = part.trim();
      if (item.length > 0) {
        parts.push(item);
      }
    }
    return parts;
  }
  if (value instanceof Array) {
    const parts: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && item.trim().length > 0) {
        parts.push(item.trim());
      }
    }
    return parts;
  }
  return [];
}

function recordOf(frontmatter: unknown): Record<string, unknown> {
  if (!frontmatter || typeof frontmatter !== "object") {
    return {};
  }
  return frontmatter as Record<string, unknown>;
}

function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function parseLengthKind(value: unknown): LengthKind | "" {
  const text = textOf(value).toLocaleLowerCase("pt-BR");
  if (text === "micro" || text === "microconto") {
    return "micro";
  }
  if (text === "flash" || text === "flash fiction") {
    return "flash";
  }
  if (text === "story" || text === "conto") {
    return "story";
  }
  if (text === "novelette" || text === "noveleta") {
    return "novelette";
  }
  return "";
}

export function storyFromFrontmatter(frontmatter: unknown): StorySheet {
  const record = recordOf(frontmatter);
  const lengthKind = parseLengthKind(record[LENGTH_KIND_KEY]);
  const defaults = lengthKind ? LENGTH_BOUNDS[lengthKind] : { floor: 0, ceiling: 0 };
  return {
    lengthKind,
    floor: numberOf(record[FLOOR_KEY]) || defaults.floor,
    ceiling: numberOf(record[CEILING_KEY]) || defaults.ceiling,
    pinOpen: textOf(record[PIN_OPEN_KEY]),
    pinClose: textOf(record[PIN_CLOSE_KEY]),
    revealed: stringsOf(record[REVEALED_KEY]),
    secret: stringsOf(record[SECRET_KEY]),
    effect: textOf(record[EFFECT_KEY]),
    motifs: stringsOf(record[MOTIF_KEY]),
  };
}

export function assignLengthKind(
  frontmatter: Record<string, unknown>,
  kind: LengthKind
): void {
  const bounds = LENGTH_BOUNDS[kind];
  frontmatter[LENGTH_KIND_KEY] = kind;
  frontmatter[FLOOR_KEY] = bounds.floor;
  frontmatter[CEILING_KEY] = bounds.ceiling;
}

export function lengthStatus(words: number, sheet: StorySheet): LengthStatus {
  return {
    words,
    floor: sheet.floor,
    ceiling: sheet.ceiling,
    belowFloor: sheet.floor > 0 && words < sheet.floor,
    overCeiling: sheet.ceiling > 0 && words > sheet.ceiling,
    kind: sheet.lengthKind,
  };
}

/** First and last prose paragraphs — pinned while the middle is rewritten. */
export function edgeParagraphs(text: string): { open: string; close: string; middle: string } {
  const body = noteBody(text).replace(/\r\n/g, "\n").trim();
  if (body.length === 0) {
    return { open: "", close: "", middle: "" };
  }
  const blocks: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    if (block.trim().length > 0) {
      blocks.push(block.trim());
    }
  }
  if (blocks.length === 0) {
    return { open: "", close: "", middle: "" };
  }
  if (blocks.length === 1) {
    return { open: blocks[0], close: blocks[0], middle: "" };
  }
  return {
    open: blocks[0],
    close: blocks[blocks.length - 1],
    middle: blocks.slice(1, -1).join("\n\n"),
  };
}

export function pinEdges(
  frontmatter: Record<string, unknown>,
  open: string,
  close: string
): void {
  if (open.trim().length > 0) {
    frontmatter[PIN_OPEN_KEY] = open.trim();
  } else {
    delete frontmatter[PIN_OPEN_KEY];
  }
  if (close.trim().length > 0) {
    frontmatter[PIN_CLOSE_KEY] = close.trim();
  } else {
    delete frontmatter[PIN_CLOSE_KEY];
  }
}

export function setKnowledge(
  frontmatter: Record<string, unknown>,
  revealed: string[],
  secret: string[]
): void {
  if (revealed.length > 0) {
    frontmatter[REVEALED_KEY] = revealed;
  } else {
    delete frontmatter[REVEALED_KEY];
  }
  if (secret.length > 0) {
    frontmatter[SECRET_KEY] = secret;
  } else {
    delete frontmatter[SECRET_KEY];
  }
}

export function setCentralEffect(
  frontmatter: Record<string, unknown>,
  effect: string
): void {
  if (effect.trim().length > 0) {
    frontmatter[EFFECT_KEY] = effect.trim();
  } else {
    delete frontmatter[EFFECT_KEY];
  }
}

/**
 * Passages that dilute the central effect: long stretches without any word
 * from the effect sentence, once the effect is set.
 */
export function dilutingPassages(text: string, effect: string): string[] {
  const needle = textOf(effect).toLocaleLowerCase("pt-BR");
  if (needle.length === 0) {
    return [];
  }
  const keys: string[] = [];
  for (const part of needle.split(/\s+/)) {
    if (part.length >= 4) {
      keys.push(part);
    }
  }
  if (keys.length === 0) {
    return [];
  }
  const body = noteBody(text).replace(/\r\n/g, "\n");
  const weak: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const paragraph = block.trim();
    if (paragraph.length < 80) {
      continue;
    }
    const lower = paragraph.toLocaleLowerCase("pt-BR");
    let hit = false;
    for (const key of keys) {
      if (lower.indexOf(key) >= 0) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      weak.push(paragraph.slice(0, 120));
    }
  }
  return weak;
}

export function projectMotifs(frontmatter: unknown): string[] {
  return stringsOf(recordOf(frontmatter)[MOTIFS_KEY]);
}

export function setProjectMotifs(
  frontmatter: Record<string, unknown>,
  motifs: string[]
): void {
  if (motifs.length > 0) {
    frontmatter[MOTIFS_KEY] = motifs;
  } else {
    delete frontmatter[MOTIFS_KEY];
  }
}

export function setPieceMotifs(
  frontmatter: Record<string, unknown>,
  motifs: string[]
): void {
  if (motifs.length > 0) {
    frontmatter[MOTIF_KEY] = motifs;
  } else {
    delete frontmatter[MOTIF_KEY];
  }
}

export function motifSightings(
  pieces: { path: string; title: string; text: string; motifs: string[] }[],
  projectMotifsList: string[]
): MotifSighting[] {
  const wanted = new Set(
    projectMotifsList.map((motif) => motif.toLocaleLowerCase("pt-BR"))
  );
  pieces.forEach((piece) => {
    piece.motifs.forEach((motif) => wanted.add(motif.toLocaleLowerCase("pt-BR")));
  });
  const sightings: MotifSighting[] = [];
  wanted.forEach((motif) => {
    pieces.forEach((piece) => {
      const lower = piece.text.toLocaleLowerCase("pt-BR");
      let count = 0;
      let from = 0;
      while (motif.length > 0 && from <= lower.length) {
        const at = lower.indexOf(motif, from);
        if (at < 0) {
          break;
        }
        count += 1;
        from = at + motif.length;
      }
      const tagged = piece.motifs.some(
        (mark) => mark.toLocaleLowerCase("pt-BR") === motif
      );
      if (count > 0 || tagged) {
        sightings.push({
          motif,
          path: piece.path,
          title: piece.title,
          count: Math.max(count, tagged ? 1 : 0),
        });
      }
    });
  });
  sightings.sort((left, right) =>
    left.motif === right.motif
      ? left.title.localeCompare(right.title, "pt-BR")
      : left.motif.localeCompare(right.motif, "pt-BR")
  );
  return sightings;
}

export function sittingReadMinutes(words: number, wpm = 200): number {
  return readingMinutes(words, wpm);
}
