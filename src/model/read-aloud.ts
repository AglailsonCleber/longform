import { marginNotesInLine } from "./margin-note";
import type { PageForm } from "./page-form";

export const READ_ALOUD_PAUSE = {
  verse: 320,
  paragraph: 680,
  stanza: 920,
} as const;

export type SpokenUnit = {
  text: string;
  pauseAfter: number;
  fromLine: number;
  toLine: number;
};

function bodyStartLine(lines: string[]): number {
  if (lines[0]?.trim() !== "---") {
    return 0;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return index + 1;
    }
  }
  return 0;
}

/** Prose for the voice: margin notes leave, and TK becomes a silence. */
export function spokenLine(line: string): string {
  let text = line;
  for (const note of marginNotesInLine(line).reverse()) {
    text = text.slice(0, note.from) + text.slice(note.to);
  }
  return text
    .replace(/\bTK\b/g, "…")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Units the voice speaks. Prose and column pause between paragraphs.
 * Verse pauses after each line and longer after a stanza.
 * A screenplay pauses after each line, and longer where a blank line falls.
 */
export function spokenUnits(
  contents: string,
  form: PageForm = "prose"
): SpokenUnit[] {
  const lines = contents.split(/\r?\n/);
  const start = bodyStartLine(lines);
  const units: SpokenUnit[] = [];
  let block: { line: number; text: string }[] = [];

  const flush = () => {
    if (block.length === 0) {
      return;
    }
    if (form === "verse" || form === "script") {
      block.forEach((item, index) => {
        const last = index === block.length - 1;
        const pauseAfter = last
          ? form === "verse"
            ? READ_ALOUD_PAUSE.stanza
            : READ_ALOUD_PAUSE.paragraph
          : READ_ALOUD_PAUSE.verse;
        units.push({
          text: item.text,
          pauseAfter,
          fromLine: item.line,
          toLine: item.line,
        });
      });
    } else {
      units.push({
        text: block.map((item) => item.text).join(" "),
        pauseAfter: READ_ALOUD_PAUSE.paragraph,
        fromLine: block[0].line,
        toLine: block[block.length - 1].line,
      });
    }
    block = [];
  };

  for (let index = start; index < lines.length; index += 1) {
    const text = spokenLine(lines[index]);
    if (text.length === 0) {
      flush();
      continue;
    }
    block.push({ line: index, text });
  }
  flush();
  return units;
}

/** Units from the paragraph or verse that contains `line`, through the end. */
export function spokenUnitsFromLine(
  units: SpokenUnit[],
  line: number
): SpokenUnit[] {
  const index = units.findIndex((unit) => line <= unit.toLine);
  if (index < 0) {
    return [];
  }
  return units.slice(index);
}
