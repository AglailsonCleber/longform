import { normalizePath, TFile, type App } from "obsidian";

import {
  CAPTURE_KEY,
  captureFileName,
  passageTitle,
  todayStamp,
  type CaptureKind,
  type ExerciseForm,
} from "src/model/capture";
import type { Draft } from "src/model/types";

export type NewCapture = {
  kind: CaptureKind;
  project: string;
  text: string;
  where?: string;
  seen?: string;
  work?: string;
  page?: string;
  url?: string;
  form?: ExerciseForm | "";
  goal?: number;
  goalUnit?: "words" | "lines" | "";
  bornFrom?: string;
};

const LEAD: Record<CaptureKind, string> = {
  fragment: "A loose piece, kept out of the manuscript until it is used.\n",
  observation: "What was seen. This is material, not the finished chronicle.\n",
  title: "A candidate title. The decided title stays on the project.\n",
  exercise: "An exercise in a form. It is not a scene of the book.\n",
  clipping: "A passage from a source. It is not invention.\n",
  dictation: "A spoken draft to rewrite. It is not the text to publish.\n",
  research: "Research for the project. Paste a photo with ![[image]]. It is not compiled.\n",
  question: "A revision question born from a passage.\n",
  fact: "A fact to check. It stays apart from what was invented.\n",
};

export function captureFolder(draft: Draft | null): string {
  if (!draft) {
    return "Captura";
  }
  const parent = draft.vaultPath.includes("/")
    ? draft.vaultPath.split("/").slice(0, -1).join("/")
    : "";
  return normalizePath(
    [parent, "Pesquisa"].filter((part) => part.length > 0).join("/")
  );
}

export async function createCapture(
  app: App,
  note: NewCapture,
  folder: string
): Promise<TFile> {
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
  const base = captureFileName(passageTitle(note.text || note.kind));
  let path = normalizePath(`${folder}/${base}.md`);
  let index = 2;
  while (app.vault.getAbstractFileByPath(path)) {
    path = normalizePath(`${folder}/${base} ${index}.md`);
    index += 1;
  }
  const file = await app.vault.create(path, `${LEAD[note.kind]}\n${note.text}\n`);
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter[CAPTURE_KEY] = {
      kind: note.kind,
      project: note.project,
      seen: note.seen ?? "",
      where: note.where ?? "",
      source: {
        work: note.work ?? "",
        page: note.page ?? "",
        url: note.url ?? "",
        date: note.kind === "clipping" ? todayStamp(new Date()) : "",
      },
      form: note.form ?? "",
      goal: note.goal ?? 0,
      goalUnit: note.goalUnit ?? "",
      usedIn: "",
      bornFrom: note.bornFrom ?? "",
    };
  });
  return file;
}
