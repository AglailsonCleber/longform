export type MarginNote = {
  text: string;
  from: number;
  to: number;
};

export type MarginNoteHit = {
  line: number;
  ch: number;
  text: string;
};

const MARGIN_NOTE_SOURCE = /%%[ \t]*\?[ \t]*([\s\S]*?)%%/g;

function marginNotePattern(): RegExp {
  return new RegExp(MARGIN_NOTE_SOURCE.source, "g");
}

function collectMarginNotes(source: string): RegExpExecArray[] {
  const pattern = marginNotePattern();
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    matches.push(match);
  }
  return matches;
}

/** Notes closed on this line. The body excludes the `%%?` and `%%` marks. */
export function marginNotesInLine(line: string): MarginNote[] {
  return collectMarginNotes(line).map((match) => {
    const from = match.index ?? 0;
    return {
      text: match[1].trim(),
      from,
      to: from + match[0].length,
    };
  });
}

/** Every note in a scene, including one that spans lines. */
export function marginNotesInDocument(contents: string): MarginNoteHit[] {
  return collectMarginNotes(contents).map((match) => {
    const from = match.index ?? 0;
    const line = contents.slice(0, from).split(/\r?\n/).length - 1;
    const lineStart = contents.lastIndexOf("\n", from - 1) + 1;
    return {
      line,
      ch: from - lineStart,
      text: match[1].replace(/\s+/g, " ").trim(),
    };
  });
}

/** Where the cursor sits so the writer can keep typing the question. */
export function cursorInsideMarginNote(line: string, note: MarginNote): number {
  const raw = line.slice(note.from, note.to);
  const marker = raw.match(/^%%[ \t]*\?[ \t]*/);
  const bodyFrom = note.from + (marker ? marker[0].length : 0);
  return bodyFrom + note.text.length;
}

/**
 * Appends `%%?  %%` at the end of the line, or moves into the note
 * already under the cursor.
 */
export function marginNoteEdit(
  line: string,
  cursorCh: number
): { line: string; cursor: number } {
  const host = marginNotesInLine(line).find(
    (note) => cursorCh >= note.from && cursorCh <= note.to
  );
  if (host) {
    return { line, cursor: cursorInsideMarginNote(line, host) };
  }
  const prefix = line.length > 0 && !/\s$/.test(line) ? " " : "";
  const insertion = `${prefix}%%?  %%`;
  return {
    line: `${line}${insertion}`,
    cursor: line.length + prefix.length + 4,
  };
}

/**
 * Line that can hold a note. A cursor in YAML frontmatter moves to the
 * first line after it.
 */
export function lineForMarginNote(lines: string[], cursorLine: number): number {
  if (lines.length === 0) {
    return 0;
  }
  const index = Math.min(Math.max(cursorLine, 0), lines.length - 1);
  if (lines[0].trim() !== "---") {
    return index;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return index > i ? index : i + 1;
    }
  }
  return index;
}

type WordSegmenter = {
  segment(input: string): Iterable<{ isWordLike?: boolean }>;
};

function countPlainWords(text: string): number {
  const Segmenter = (
    Intl as {
      Segmenter?: new (
        locales?: string,
        options?: { granularity: "word" }
      ) => WordSegmenter;
    }
  ).Segmenter;
  if (Segmenter) {
    let count = 0;
    for (const part of new Segmenter(undefined, { granularity: "word" }).segment(
      text
    )) {
      if (part.isWordLike) {
        count += 1;
      }
    }
    return count;
  }
  return (text.match(/[0-9A-Za-z\u00C0-\u024F]+/g) || []).length;
}

/** Words and characters inside `%%? ... %%`, including the marks. */
export function marginNoteMeasure(contents: string): {
  words: number;
  characters: number;
} {
  let words = 0;
  let characters = 0;
  for (const match of collectMarginNotes(contents)) {
    characters += match[0].length;
    words += countPlainWords(match[1]);
  }
  return { words, characters };
}

/**
 * Removes only the note spans. Surrounding spaces stay, so a character
 * count does not also drop the space before an inline note.
 */
export function hideMarginNotesForCount(contents: string): string {
  const matches = collectMarginNotes(contents);
  let result = contents;
  for (const match of matches.reverse()) {
    const start = match.index ?? 0;
    result = result.slice(0, start) + result.slice(start + match[0].length);
  }
  return result;
}

/** Lowers the first number by `words` and the second by `characters`. */
export function discountCountedLabel(
  label: string,
  words: number,
  characters: number
): string {
  const discounts = [words, characters];
  let index = 0;
  return label.replace(/\d[\d.,\u00A0\u202F]*/g, (token) => {
    if (index >= discounts.length) {
      return token;
    }
    const value = Number(token.replace(/\D/g, ""));
    const next = Math.max(0, value - discounts[index]);
    index += 1;
    return Number.isFinite(value) ? next.toLocaleString() : token;
  });
}

/**
 * Drops private margin notes from compiled text.
 * An ordinary `%% comment %%` stays for the Remove Comments step.
 */
export function stripMarginNotes(contents: string): string {
  const matches = collectMarginNotes(contents);
  if (matches.length === 0) {
    return contents;
  }

  let result = contents;
  for (const match of matches.reverse()) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const lineStart = result.lastIndexOf("\n", start - 1) + 1;
    const newlineAt = result.indexOf("\n", end);
    const lineEnd = newlineAt === -1 ? result.length : newlineAt;
    const occupiesOwnLines =
      !match[0].includes("\n") &&
      result.slice(lineStart, lineEnd).replace(match[0], "").trim() === "";

    if (occupiesOwnLines) {
      let removeTo = newlineAt === -1 ? result.length : newlineAt + 1;
      const before = result.slice(0, lineStart);
      const after = result.slice(removeTo);
      if (lineStart === 0 && after.startsWith("\n")) {
        removeTo += 1;
      } else if (
        before.endsWith("\n\n") &&
        (after.startsWith("\n") || after.startsWith("\r\n"))
      ) {
        removeTo += after.startsWith("\r\n") ? 2 : 1;
      }
      result = before + result.slice(removeTo);
      continue;
    }

    let cut = start;
    if (
      !match[0].includes("\n") &&
      cut > lineStart &&
      (result[cut - 1] === " " || result[cut - 1] === "\t")
    ) {
      cut -= 1;
    }
    result = result.slice(0, cut) + result.slice(end);
  }
  return result;
}
