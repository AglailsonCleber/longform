import { Notice, TFile, normalizePath, type App } from "obsidian";
import { get } from "svelte/store";

import { todayStamp } from "src/model/capture";
import {
  applyTemplate,
  assignPiece,
  contentsMarkdown,
  contentsOf,
  manuscriptText,
  movePiece,
  pieceFromFrontmatter,
  proseIsEmpty,
  templateBody,
  type PieceSheet,
  type TemplateKind,
} from "src/model/architecture";
import { scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import type { Draft, MultipleSceneDraft } from "src/model/types";
import { createNote } from "src/model/note-utils";

import type { CommandBuilder } from "./types";

const KIND_NAME: Record<TemplateKind, string> = {
  scene: "Scene",
  sonnet: "Sonnet",
  chronicle: "Column",
};

function parentPath(vaultPath: string): string {
  const parts = vaultPath.split("/");
  parts.pop();
  return parts.join("/");
}

function readingFile(draft: Draft, name: string): string {
  return normalizePath(
    [parentPath(draft.vaultPath), "Reading", name].filter((part) => part.length > 0).join("/")
  );
}

async function writeReadingFile(app: App, path: string, text: string): Promise<TFile | null> {
  const current = app.vault.getAbstractFileByPath(path);
  if (current instanceof TFile) {
    await app.vault.modify(current, text);
    return current;
  }
  return createNote(app, path, text);
}

function sheetsFor(app: App, draft: MultipleSceneDraft): PieceSheet[] {
  const pieces: PieceSheet[] = [];
  for (const scene of draft.scenes) {
    const path = scenePath(scene.title, draft, app.vault);
    if (!path) {
      continue;
    }
    const file = app.vault.getAbstractFileByPath(path);
    const frontmatter =
      file instanceof TFile
        ? app.metadataCache.getFileCache(file)?.frontmatter
        : undefined;
    pieces.push(pieceFromFrontmatter(path, scene.title, scene.indent, frontmatter));
  }
  return pieces;
}

async function sceneTexts(
  app: App,
  pieces: PieceSheet[]
): Promise<{ text: string; role: string }[]> {
  const parts: { text: string; role: string }[] = [];
  for (const piece of pieces) {
    const file = app.vault.getAbstractFileByPath(piece.path);
    if (!(file instanceof TFile)) {
      continue;
    }
    parts.push({
      text: await app.vault.cachedRead(file),
      role: piece.role,
    });
  }
  return parts;
}

export async function readManuscript(app: App): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  let body = "";
  if (draft.format === "single") {
    body = manuscriptText([
      {
        role: pieceFromFrontmatter(
          draft.vaultPath,
          draft.title,
          0,
          app.metadataCache.getCache(draft.vaultPath)?.frontmatter
        ).role,
        text: await app.vault.adapter.read(draft.vaultPath),
      },
    ]);
  } else {
    body = manuscriptText(await sceneTexts(app, sheetsFor(app, draft)));
  }
  const file = await writeReadingFile(
    app,
    readingFile(draft, "Manuscript.md"),
    `A reading copy. The scenes stay separate.\n\n${body}\n`
  );
  if (file) {
    await app.workspace.getLeaf(false).openFile(file);
  }
}

export async function writeContents(app: App): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const pieces =
    draft.format === "single"
      ? [
          pieceFromFrontmatter(
            draft.vaultPath,
            draft.title,
            0,
            app.metadataCache.getCache(draft.vaultPath)?.frontmatter
          ),
        ]
      : sheetsFor(app, draft);
  const file = await writeReadingFile(
    app,
    readingFile(draft, "Contents.md"),
    `${contentsMarkdown(contentsOf(pieces))}\n`
  );
  if (file) {
    await app.workspace.getLeaf(false).openFile(file);
  }
}

export async function createFormPiece(
  app: App,
  kind: TemplateKind
): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  if (draft.format === "single") {
    await applyFormToFile(app, draft.vaultPath, kind);
    return;
  }
  const base = KIND_NAME[kind];
  let name = base;
  let index = 2;
  const taken = new Set(draft.scenes.map((scene) => scene.title));
  while (taken.has(name)) {
    name = `${base} ${index}`;
    index += 1;
  }
  const path = scenePath(name, draft, app.vault);
  if (!path) {
    return;
  }
  const file = await createNote(app, path, `${templateBody(kind)}\n`);
  if (!file) {
    return;
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    applyTemplate(frontmatter, kind, false);
  });
  drafts.update((all) =>
    all.map((item) => {
      if (item.vaultPath !== draft.vaultPath || item.format !== "scenes") {
        return item;
      }
      const already = item.scenes.some((scene) => scene.title === name);
      return {
        ...item,
        scenes: already ? item.scenes : [...item.scenes, { title: name, indent: 0 }],
        unknownFiles: item.unknownFiles.filter((entry) => entry !== name),
      };
    })
  );
  await app.workspace.getLeaf(false).openFile(file);
}

async function applyFormToFile(
  app: App,
  path: string,
  kind: TemplateKind
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  const current = await app.vault.read(file);
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    applyTemplate(frontmatter, kind, true);
  });
  if (proseIsEmpty(current)) {
    await app.vault.append(file, `\n${templateBody(kind)}\n`);
  } else {
    new Notice("The form was added. The text already there was left in place.");
  }
  await app.workspace.getLeaf(false).openFile(file);
}

export async function savePiece(app: App, piece: PieceSheet): Promise<void> {
  const file = app.vault.getAbstractFileByPath(piece.path);
  if (!(file instanceof TFile)) {
    return;
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    assignPiece(frontmatter, piece);
  });
}

export async function markWritten(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  const written = todayStamp(new Date());
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter["longform-written"] = written;
  });
}

export function moveReadingOrder(vaultPath: string, from: number, to: number): void {
  drafts.update((all) =>
    all.map((item) => {
      if (item.vaultPath !== vaultPath || item.format !== "scenes") {
        return item;
      }
      return { ...item, scenes: movePiece(item.scenes, from, to) };
    })
  );
}

export const readThrough: CommandBuilder = (plugin) => ({
  id: "longform-read-through",
  name: "Read the manuscript through",
  callback: () => {
    void readManuscript(plugin.app);
  },
});

export const writeTheContents: CommandBuilder = (plugin) => ({
  id: "longform-write-contents",
  name: "Write the contents",
  callback: () => {
    void writeContents(plugin.app);
  },
});

export const newSceneCard: CommandBuilder = (plugin) => ({
  id: "longform-new-scene-card",
  name: "New scene with metadata",
  callback: () => {
    void createFormPiece(plugin.app, "scene");
  },
});

export const newSonnetPiece: CommandBuilder = (plugin) => ({
  id: "longform-new-sonnet",
  name: "New sonnet",
  callback: () => {
    void createFormPiece(plugin.app, "sonnet");
  },
});

export const newColumnPiece: CommandBuilder = (plugin) => ({
  id: "longform-new-column",
  name: "New column",
  callback: () => {
    void createFormPiece(plugin.app, "chronicle");
  },
});
