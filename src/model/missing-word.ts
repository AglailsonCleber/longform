export const MISSING_WORD = "TK";

export type MissingWordHit = {
  line: number;
  ch: number;
  text: string;
};

const TK_PATTERN = /\bTK\b/g;

function frontmatterEnd(contents: string): number {
  const match = contents.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? match[0].length : 0;
}

function tkRanges(text: string, base = 0): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  const pattern = new RegExp(TK_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const from = base + (match.index ?? 0);
    ranges.push({ from, to: from + match[0].length });
  }
  return ranges;
}

function insideMarginNote(contents: string, index: number): boolean {
  const pattern = /%%[ \t]*\?[\s\S]*?%%/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(contents))) {
    const from = match.index ?? 0;
    if (index >= from && index < from + match[0].length) {
      return true;
    }
  }
  return false;
}

/** `TK` tokens in one line. The mark is the whole word, never part of another. */
export function missingWordsInLine(line: string): { from: number; to: number }[] {
  return tkRanges(line);
}

/**
 * Places `TK` at the cursor. A cursor already on one selects that marker
 * so the writer can replace it with the word.
 */
export function missingWordEdit(
  line: string,
  cursorCh: number
): { line: string; from: number; to: number } {
  const host = missingWordsInLine(line).find(
    (word) => cursorCh >= word.from && cursorCh <= word.to
  );
  if (host) {
    return { line, from: host.from, to: host.to };
  }
  const next = `${line.slice(0, cursorCh)}${MISSING_WORD}${line.slice(cursorCh)}`;
  return { line: next, from: cursorCh, to: cursorCh + MISSING_WORD.length };
}

/** A short piece of the line, with the marker in the middle. */
export function missingWordSnippet(line: string, ch: number): string {
  const start = Math.max(0, ch - 28);
  const end = Math.min(line.length, ch + MISSING_WORD.length + 28);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < line.length ? "…" : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

/** Every `TK` in the manuscript body. Frontmatter and margin notes are skipped. */
export function missingWordsInDocument(contents: string): MissingWordHit[] {
  const bodyFrom = frontmatterEnd(contents);
  const hits: MissingWordHit[] = [];
  for (const range of tkRanges(contents.slice(bodyFrom), bodyFrom)) {
    if (insideMarginNote(contents, range.from)) {
      continue;
    }
    const line = contents.slice(0, range.from).split(/\r?\n/).length - 1;
    const lineStart = contents.lastIndexOf("\n", range.from - 1) + 1;
    const ch = range.from - lineStart;
    const lineText = contents.split(/\r?\n/)[line] ?? "";
    hits.push({
      line,
      ch,
      text: missingWordSnippet(lineText, ch),
    });
  }
  return hits;
}
