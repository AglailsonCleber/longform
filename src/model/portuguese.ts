/** Em dash used to open speech in Portuguese prose. */
export const DIALOGUE_DASH = "\u2014";

export const OPEN_QUOTE = "\u201C";
export const CLOSE_QUOTE = "\u201D";

export type SpanEdit = {
  from: number;
  to: number;
  text: string;
  cursor: number;
};

const OPENING_DASH = /^(?:—[ \t]?|–[ \t]?|--[ \t]?|-[ \t])/;

/**
 * A dialogue dash at the start of the line, or a narration break mid-line.
 * A hyphen, en dash, or double hyphen already standing in for the dash
 * becomes the em dash.
 */
export function dialogueDashEdit(line: string, ch: number): SpanEdit {
  const leading = line.match(/^[ \t]*/)?.[0].length ?? 0;
  if (ch <= leading) {
    const rest = line.slice(leading);
    const opening = rest.match(OPENING_DASH);
    const body = opening ? rest.slice(opening[0].length) : rest;
    return {
      from: leading,
      to: line.length,
      text: `${DIALOGUE_DASH} ${body}`,
      cursor: leading + 2,
    };
  }

  const before = line.slice(0, ch);
  const after = line.slice(ch);
  const left = /[ \t]$/.test(before) ? "" : " ";
  const right = /^[ \t]/.test(after) ? "" : " ";
  const text = `${left}${DIALOGUE_DASH}${right}`;
  return { from: ch, to: ch, text, cursor: ch + text.length };
}

/**
 * A hyphen joins words. A space on either side of the cursor is removed
 * so `bem vindo` becomes `bem-vindo` instead of a dash.
 */
export function hyphenEdit(line: string, ch: number): SpanEdit {
  const before = line.slice(0, ch);
  const after = line.slice(ch);
  const leftSpace = /[ \t]$/.test(before);
  const rightSpace = /^[ \t]/.test(after);
  const from = leftSpace ? ch - 1 : ch;
  const to = rightSpace ? ch + 1 : ch;
  return { from, to, text: "-", cursor: from + 1 };
}

export function applySpan(line: string, edit: SpanEdit): string {
  return line.slice(0, edit.from) + edit.text + line.slice(edit.to);
}

/** Curly quotes around a selection. An empty selection leaves the cursor inside. */
export function quotedText(selected: string): {
  text: string;
  cursorOffset: number;
} {
  if (selected.length === 0) {
    return { text: `${OPEN_QUOTE}${CLOSE_QUOTE}`, cursorOffset: 1 };
  }
  return {
    text: `${OPEN_QUOTE}${selected}${CLOSE_QUOTE}`,
    cursorOffset: selected.length + 2,
  };
}
