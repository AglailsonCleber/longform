import type { App, Editor, TFile } from "obsidian";

export const PAGE_FORMS = ["prose", "verse", "column", "script"] as const;

export type PageForm = (typeof PAGE_FORMS)[number];

export const PAGE_FORM_KEY = "longform-form";

export const PAGE_FORM_CLASSES = PAGE_FORMS.map(
  (form) => `longform-form-${form}`
);

/** Missing or unknown values stay prose, so older notes do not change. */
export function pageForm(value: unknown): PageForm {
  if (value === "verse" || value === "column" || value === "script") {
    return value;
  }
  return "prose";
}

export function pageFormClass(form: PageForm): string {
  return `longform-form-${form}`;
}

/** Writes the form beside the Longform block so a later project save keeps it. */
export async function setNoteForm(
  app: App,
  file: TFile,
  form: PageForm
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    if (form === "prose") {
      delete frontmatter[PAGE_FORM_KEY];
      return;
    }
    frontmatter[PAGE_FORM_KEY] = form;
  });
}

/** A blank line, then the next verse. The cursor lands on the new line. */
export function insertStanza(editor: Editor): void {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  editor.replaceRange("\n\n", { line: cursor.line, ch: line.length });
  editor.setCursor({ line: cursor.line + 2, ch: 0 });
}

export function insertSceneHeading(editor: Editor): void {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  if (line.trim().length === 0) {
    editor.setLine(cursor.line, "INT. ");
    editor.setCursor({ line: cursor.line, ch: 5 });
    return;
  }
  editor.replaceRange("\n\nINT. ", { line: cursor.line, ch: line.length });
  editor.setCursor({ line: cursor.line + 2, ch: 5 });
}

export function insertCharacterCue(editor: Editor): void {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line).trim();
  const cue = (line.length > 0 ? line : "NAME").toUpperCase();
  editor.setLine(cursor.line, cue);
  editor.setCursor({ line: cursor.line, ch: cue.length });
}

export function insertParenthetical(editor: Editor): void {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  if (line.trim().length === 0) {
    editor.setLine(cursor.line, "()");
    editor.setCursor({ line: cursor.line, ch: 1 });
    return;
  }
  editor.replaceRange("\n()\n", { line: cursor.line, ch: line.length });
  editor.setCursor({ line: cursor.line + 1, ch: 1 });
}
