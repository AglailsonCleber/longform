export const PAGE_MODE_CLASSES = [
  "longform-highlight-line",
  "longform-focus",
  "longform-typewriter",
] as const;

export type PageModeSettings = {
  highlightCurrentLine: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
};

export function pageModeClasses(settings: PageModeSettings): string[] {
  const classes: string[] = [];
  if (settings.highlightCurrentLine) {
    classes.push("longform-highlight-line");
  }
  if (settings.focusMode) {
    classes.push("longform-focus");
  }
  if (settings.typewriterMode) {
    classes.push("longform-typewriter");
  }
  return classes;
}

/**
 * Inclusive line indexes of the paragraph containing `lineIndex`.
 * A blank line is a boundary. The cursor sitting on a blank line
 * keeps that line alone.
 */
export function paragraphSpan(
  lineCount: number,
  lineIndex: number,
  lineText: (index: number) => string
): { from: number; to: number } {
  if (lineCount <= 0) {
    return { from: 0, to: 0 };
  }
  const index = Math.min(Math.max(lineIndex, 0), lineCount - 1);
  if (lineText(index).trim() === "") {
    return { from: index, to: index };
  }
  let from = index;
  while (from > 0 && lineText(from - 1).trim() !== "") {
    from -= 1;
  }
  let to = index;
  while (to < lineCount - 1 && lineText(to + 1).trim() !== "") {
    to += 1;
  }
  return { from, to };
}

export type PageLineMark = {
  line: number;
  classes: string;
};

/** Line marks for focus (current paragraph) and the highlighted cursor line. */
export function pageLineMarks(
  lineCount: number,
  cursorLine: number,
  mode: { focus: boolean; highlight: boolean },
  lineText: (index: number) => string
): PageLineMark[] {
  if (lineCount <= 0 || (!mode.focus && !mode.highlight)) {
    return [];
  }
  const index = Math.min(Math.max(cursorLine, 0), lineCount - 1);
  if (mode.focus) {
    const span = paragraphSpan(lineCount, index, lineText);
    const marks: PageLineMark[] = [];
    for (let line = span.from; line <= span.to; line += 1) {
      const classes = ["longform-current-paragraph"];
      // The cursor line stays marked even when Enter has just made it blank,
      // so the new paragraph does not vanish into the dimmed page.
      if (line === index) {
        classes.push("longform-current-line");
      }
      marks.push({ line, classes: classes.join(" ") });
    }
    return marks;
  }
  return [{ line: index, classes: "longform-current-line" }];
}
