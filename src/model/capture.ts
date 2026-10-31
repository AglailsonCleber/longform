export const CAPTURE_KEY = "longform-capture";

export const CAPTURE_KINDS = [
  "fragment",
  "observation",
  "title",
  "exercise",
  "clipping",
  "dictation",
  "research",
  "question",
  "fact",
] as const;

export type CaptureKind = (typeof CAPTURE_KINDS)[number];

export const EXERCISE_FORMS = [
  "prose",
  "verse",
  "column",
  "script",
  "sonnet",
  "flash",
] as const;

export type ExerciseForm = (typeof EXERCISE_FORMS)[number];

export type CaptureSource = {
  work: string;
  page: string;
  url: string;
  date: string;
};

export type CaptureNote = {
  path: string;
  kind: CaptureKind;
  /** Empty until the note is kept in a project. */
  project: string;
  seen: string;
  where: string;
  source: CaptureSource;
  form: ExerciseForm | "";
  goal: number;
  goalUnit: "words" | "lines" | "";
  usedIn: string;
  bornFrom: string;
};

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function kindOf(value: unknown): CaptureKind | null {
  for (const kind of CAPTURE_KINDS) {
    if (value === kind) {
      return kind;
    }
  }
  return null;
}

function formOf(value: unknown): ExerciseForm | "" {
  for (const form of EXERCISE_FORMS) {
    if (value === form) {
      return form;
    }
  }
  return "";
}

function sourceOf(value: unknown): CaptureSource {
  if (!value || typeof value !== "object") {
    return { work: "", page: "", url: "", date: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    work: textOf(record.work),
    page: textOf(record.page),
    url: textOf(record.url),
    date: textOf(record.date),
  };
}

function numberOf(value: unknown): number {
  return typeof value === "number" && value > 0 ? value : 0;
}

/** A capture sits beside the manuscript. An empty project means the inbox. */
export function captureFromFrontmatter(
  path: string,
  frontmatter: unknown
): CaptureNote | null {
  if (!frontmatter || typeof frontmatter !== "object") {
    return null;
  }
  const raw = (frontmatter as Record<string, unknown>)[CAPTURE_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const kind = kindOf(record.kind);
  if (!kind) {
    return null;
  }
  const unit = record.goalUnit;
  return {
    path,
    kind,
    project: textOf(record.project),
    seen: textOf(record.seen),
    where: textOf(record.where),
    source: sourceOf(record.source),
    form: formOf(record.form),
    goal: numberOf(record.goal),
    goalUnit: unit === "words" || unit === "lines" ? unit : "",
    usedIn: textOf(record.usedIn),
    bornFrom: textOf(record.bornFrom),
  };
}

export function inboxCaptures(notes: CaptureNote[]): CaptureNote[] {
  return notes.filter((note) => note.project.length === 0);
}

export function projectCaptures(notes: CaptureNote[], title: string): CaptureNote[] {
  return notes.filter((note) => note.project === title);
}

export function todayStamp(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}-${
    day < 10 ? "0" : ""
  }${day}`;
}

export function captureFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "Note";
}

export function passageTitle(selection: string): string {
  const line = selection.trim().split(/\r?\n/)[0] ?? "";
  const words = line.split(/\s+/).filter((word) => word.length > 0).slice(0, 6);
  return words.length > 0 ? words.join(" ") : "Note";
}

function bodyOf(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/%%[\s\S]*?%%/g, " ");
}

export function countedWords(text: string): number {
  const body = bodyOf(text).trim();
  if (body.length === 0) {
    return 0;
  }
  return body.split(/\s+/).filter((word) => word.length > 0).length;
}

export function countedLines(text: string): number {
  return bodyOf(text)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
}

export function exerciseProgress(
  text: string,
  note: Pick<CaptureNote, "goal" | "goalUnit">
): { count: number; goal: number; unit: "words" | "lines" | "" } {
  const count = note.goalUnit === "lines" ? countedLines(text) : countedWords(text);
  return { count, goal: note.goal, unit: note.goalUnit };
}

/** A sonnet is verse. A flash is prose. The page follows that form. */
export function exercisePageForm(
  form: ExerciseForm | ""
): "prose" | "verse" | "column" | "script" {
  if (form === "sonnet" || form === "verse") {
    return "verse";
  }
  if (form === "column") {
    return "column";
  }
  if (form === "script") {
    return "script";
  }
  return "prose";
}
