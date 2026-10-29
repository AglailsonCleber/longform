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

export const MEASURE_WIDTH = { min: 40, max: 100, fallback: 66 };
export const MEASURE_LINE_HEIGHT = { min: 1.2, max: 2.4, fallback: 1.7 };
export const MEASURE_MARGIN = { min: 0, max: 120, fallback: 32 };

export type ReadingMeasureSettings = {
  readingMeasure: boolean;
  measureWidth: number;
  lineHeight: number;
  pageMargin: number;
};

export function clampMeasure(
  value: number,
  bounds: { min: number; max: number; fallback: number }
): number {
  if (!Number.isFinite(value)) {
    return bounds.fallback;
  }
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/** CSS variables for the reading column. Absent when the measure is off. */
export function readingMeasureVars(
  settings: ReadingMeasureSettings
): Record<string, string> | null {
  if (!settings.readingMeasure) {
    return null;
  }
  return {
    "--longform-measure-width": `${clampMeasure(
      settings.measureWidth,
      MEASURE_WIDTH
    )}ch`,
    "--longform-line-height": String(
      clampMeasure(settings.lineHeight, MEASURE_LINE_HEIGHT)
    ),
    "--longform-page-margin": `${clampMeasure(
      settings.pageMargin,
      MEASURE_MARGIN
    )}px`,
  };
}

export const READING_MEASURE_PROPERTIES = [
  "--longform-measure-width",
  "--longform-line-height",
  "--longform-page-margin",
] as const;

export const MANUSCRIPT_LIGHT_CLASS = "longform-manuscript-light";

/** Class for a light writing page. The rest of the app keeps its own theme. */
export function manuscriptLightClass(enabled: boolean): string | null {
  return enabled ? MANUSCRIPT_LIGHT_CLASS : null;
}

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
