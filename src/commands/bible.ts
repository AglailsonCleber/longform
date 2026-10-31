import { normalizePath, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  CARD_KEY,
  cardFileName,
  cardsForProject,
  nameHitsInLine,
  replaceWholeName,
  type CardKind,
} from "src/model/bible";
import { bibleCards } from "src/model/bible-store";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";
import type { Draft } from "src/model/types";
import { ReplaceNameModal } from "src/view/bible/bible-modals";

import type { CommandBuilder } from "./types";

const CARD_BODY: Record<CardKind, string> = {
  person:
    "Aliases belong in names. A bond has with, label, from, and until. Voice words are tics. Voice never is what this person does not say.\n",
  place:
    "Scenes that use this name are listed on the Bible tab. longform-place on a scene links it even when the name is absent.\n",
  thing: "Aliases belong in names.\n",
  world:
    "lexicon.endings decide how a new name should sound. lexicon.samples are examples. calendar.eras align with longform-when on a scene.\n",
};

export async function createBibleCard(
  app: App,
  draft: Draft,
  kind: CardKind,
  name: string
): Promise<TFile | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    new Notice("A card needs a name of at least two letters.");
    return null;
  }
  let root = "";
  try {
    const folder = app.vault.getAbstractFileByPath(draft.vaultPath);
    root = folder && "parent" in folder && folder.parent ? folder.parent.path : "";
  } catch {
    root = "";
  }
  const directory = normalizePath(
    [root, "Bíblia"].filter((part) => part.length > 0).join("/")
  );
  if (!app.vault.getAbstractFileByPath(directory)) {
    await app.vault.createFolder(directory);
  }
  const base = cardFileName(trimmed);
  let path = normalizePath(`${directory}/${base}.md`);
  let index = 2;
  while (app.vault.getAbstractFileByPath(path)) {
    path = normalizePath(`${directory}/${base} ${index}.md`);
    index += 1;
  }
  const file = await app.vault.create(path, CARD_BODY[kind]);
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    const card: Record<string, unknown> = {
      project: draft.title,
      kind,
      status: "hypothesis",
      basis: "invention",
      names: [trimmed],
    };
    if (kind === "person") {
      card.bonds = [];
      card.voice = { words: [], never: [] };
    }
    if (kind === "world") {
      card.calendar = { weekdays: [], moons: [], eras: [] };
      card.lexicon = { tongue: "", endings: [], samples: [] };
    }
    frontmatter[CARD_KEY] = card;
  });
  return file;
}

export async function manuscriptFiles(app: App, title: string): Promise<TFile[]> {
  const files: TFile[] = [];
  for (const draft of get(drafts)) {
    if (draft.title !== title) {
      continue;
    }
    if (draft.format === "single") {
      const file = app.vault.getAbstractFileByPath(draft.vaultPath);
      if (file instanceof TFile) {
        files.push(file);
      }
      continue;
    }
    for (const scene of draft.scenes) {
      let path = "";
      try {
        path = scenePath(scene.title, draft, app.vault);
      } catch {
        path = "";
      }
      const file = path ? app.vault.getAbstractFileByPath(path) : null;
      if (file instanceof TFile) {
        files.push(file);
      }
    }
  }
  return files;
}

export async function replaceNameInProject(
  app: App,
  title: string,
  fromName: string,
  toName: string,
  write: boolean
): Promise<number> {
  let count = 0;
  for (const file of await manuscriptFiles(app, title)) {
    const text = await app.vault.read(file);
    const next = replaceWholeName(text, fromName, toName);
    count += next.count;
    if (write && next.count > 0) {
      await app.vault.modify(file, next.text);
    }
  }
  return count;
}

export const openCardAtCursor: CommandBuilder = (plugin) => ({
  id: "longform-open-card",
  name: "Open card at cursor",
  editorCheckCallback(checking, editor, view) {
    const file = view.file;
    const draft = file ? draftForPath(file.path, get(drafts)) : null;
    if (!draft) {
      return false;
    }
    const cards = cardsForProject(get(bibleCards), draft.title);
    const cursor = editor.getCursor();
    const hit = nameHitsInLine(editor.getLine(cursor.line), cards).find(
      (item) => cursor.ch >= item.from && cursor.ch <= item.to
    );
    if (!hit) {
      return false;
    }
    if (checking) {
      return true;
    }
    const target = plugin.app.vault.getAbstractFileByPath(hit.cardPath);
    if (target instanceof TFile) {
      void plugin.app.workspace.getLeaf(false).openFile(target);
    }
  },
});

export const replaceBookName: CommandBuilder = (plugin) => ({
  id: "longform-replace-book-name",
  name: "Replace a name in the book",
  editorCheckCallback(checking, _editor, view) {
    const draft = view.file ? draftForPath(view.file.path, get(drafts)) : null;
    if (!draft) {
      return false;
    }
    if (checking) {
      return true;
    }
    new ReplaceNameModal(
      plugin.app,
      "",
      (fromName, toName) =>
        replaceNameInProject(plugin.app, draft.title, fromName, toName, false),
      async (fromName, toName) => {
        const count = await replaceNameInProject(
          plugin.app,
          draft.title,
          fromName,
          toName,
          true
        );
        new Notice(
          count === 0 ? "That name is not in the manuscript." : `Replaced ${count}.`
        );
        return count;
      }
    ).open();
  },
});
