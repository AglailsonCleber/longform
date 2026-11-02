import { MarkdownView, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  WORD_KEY,
  archiveManifest,
  bookDictionary,
  datedStamp,
  folderOutsideVault,
  safeRelativePath,
  safeTitle,
  searchPieces,
  syllablesInText,
  withoutWord,
  wordsIn,
} from "src/model/archive";
import type { ArchiveFile, ProjectPiece } from "src/model/archive";
import { envelopeFrom, openArchive, sealArchive } from "src/model/archive-crypto";
import { cardsForProject } from "src/model/bible";
import { bibleCards } from "src/model/bible-store";
import { captures } from "src/model/capture-store";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts, pluginSettings, selectedDraft } from "src/model/stores";
import type { Draft } from "src/model/types";
import { readSuggestionReply, suggestionMessages } from "src/model/suggestion";
import type { SuggestionKind } from "src/model/suggestion";
import { revisionLedger } from "src/view/revision-ledger";
import {
  AskKindModal,
  DecryptModal,
  EncryptModal,
  FolderModal,
  SuggestionModal,
} from "src/view/archive/archive-modals";
import { announce } from "src/view/live-region";

import type { CommandBuilder } from "./types";

type NodeFS = {
  mkdirSync: (path: string, options: { recursive: boolean }) => void;
  writeFileSync: (path: string, data: string, encoding: "utf8") => void;
  readFileSync: (path: string, encoding: "utf8") => string;
};

type NodePath = {
  join: (...parts: string[]) => string;
  dirname: (path: string) => string;
  resolve: (...parts: string[]) => string;
};

function desktop(): { fs: NodeFS; path: NodePath } | null {
  const holder = globalThis as { require?: (id: string) => unknown };
  if (!holder.require) {
    return null;
  }
  try {
    return {
      fs: holder.require("fs") as NodeFS,
      path: holder.require("path") as NodePath,
    };
  } catch {
    return null;
  }
}

function vaultBase(app: App): string {
  const adapter = app.vault.adapter as { getBasePath?: () => string };
  return adapter.getBasePath?.() ?? "";
}

export function defaultCopyFolder(app: App, title: string): string {
  const modules = desktop();
  const base = vaultBase(app);
  if (!modules || base.length === 0) {
    return "";
  }
  return modules.path.join(
    modules.path.dirname(base),
    "Longform Archive",
    safeTitle(title),
    datedStamp(new Date())
  );
}

async function readVaultFile(app: App, path: string): Promise<string | null> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return null;
  }
  return app.vault.read(file);
}

export async function projectPieces(app: App, draft: Draft): Promise<ProjectPiece[]> {
  const pieces: ProjectPiece[] = [];
  const seen = new Set<string>();
  const add = async (path: string, kind: ProjectPiece["kind"]): Promise<void> => {
    if (seen.has(path)) {
      return;
    }
    const text = await readVaultFile(app, path);
    if (text === null) {
      return;
    }
    seen.add(path);
    pieces.push({ path, text, kind });
  };
  await add(draft.vaultPath, "scene");
  if (draft.format === "scenes") {
    for (const scene of draft.scenes) {
      await add(scenePath(scene.title, draft, app.vault), "scene");
    }
  }
  for (const card of cardsForProject(get(bibleCards), draft.title)) {
    await add(card.path, "card");
  }
  for (const note of get(captures)) {
    if (note.project === draft.title && note.kind === "research") {
      await add(note.path, "research");
    }
  }
  return pieces;
}

function extraCaptureFiles(draft: Draft): { path: string }[] {
  const extra: { path: string }[] = [];
  for (const note of get(captures)) {
    if (note.project === draft.title && note.kind !== "research") {
      extra.push({ path: note.path });
    }
  }
  return extra;
}

function historyFiles(draft: Draft, paths: Set<string>): ArchiveFile[] {
  const ledger = revisionLedger();
  if (!ledger) {
    return [];
  }
  const files: ArchiveFile[] = [];
  let count = 0;
  for (const version of ledger.versions) {
    if (!paths.has(version.path)) {
      continue;
    }
    count += 1;
    const name = version.name.length > 0 ? version.name : "While writing";
    files.push({
      path: `versions/${count}.md`,
      text: `# ${name}\n\n${version.text}\n`,
    });
  }
  let trashed = 0;
  for (const piece of ledger.trash) {
    if (piece.project !== draft.title) {
      continue;
    }
    trashed += 1;
    files.push({ path: `trash/${trashed}.md`, text: piece.text });
  }
  return files;
}

export async function projectArchive(app: App, draft: Draft): Promise<ArchiveFile[]> {
  const pieces = await projectPieces(app, draft);
  const files: ArchiveFile[] = [];
  const paths = new Set<string>();
  for (const piece of pieces) {
    paths.add(piece.path);
    files.push({ path: piece.path, text: piece.text });
  }
  for (const note of extraCaptureFiles(draft)) {
    if (paths.has(note.path)) {
      continue;
    }
    const text = await readVaultFile(app, note.path);
    if (text === null) {
      continue;
    }
    paths.add(note.path);
    files.push({ path: note.path, text });
  }
  const history = historyFiles(draft, paths);
  for (const file of history) {
    files.push(file);
  }
  files.push({
    path: "archive.md",
    text: archiveManifest(draft.title, datedStamp(new Date()), files.slice(0, files.length - 0)),
  });
  return files;
}

function writeTree(folder: string, files: ArchiveFile[], vault: string): string | null {
  const modules = desktop();
  if (!modules) {
    return "This copy is written from the desktop app.";
  }
  if (!folderOutsideVault(folder, vault)) {
    return "Choose a folder outside the vault. A copy inside it would be read as another project.";
  }
  for (const file of files) {
    const relative = safeRelativePath(file.path);
    if (!relative) {
      return "A file in the copy has an unsafe path.";
    }
    const destination = modules.path.join(folder, relative);
    modules.fs.mkdirSync(modules.path.dirname(destination), { recursive: true });
    modules.fs.writeFileSync(destination, file.text, "utf8");
  }
  return null;
}

function currentDraft(): Draft | null {
  return get(selectedDraft);
}

export async function backupProject(app: App): Promise<void> {
  const draft = currentDraft();
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const folder = defaultCopyFolder(app, draft.title);
  if (folder.length === 0) {
    new Notice("This copy is written from the desktop app.");
    return;
  }
  const error = writeTree(folder, await projectArchive(app, draft), vaultBase(app));
  if (error) {
    new Notice(error);
    return;
  }
  new Notice(`The whole project was copied to ${folder}`);
}

export function exportProject(app: App): void {
  const draft = currentDraft();
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  new FolderModal(app, "Export this project", defaultCopyFolder(app, draft.title), (folder) => {
    void (async () => {
      const error = writeTree(folder, await projectArchive(app, draft), vaultBase(app));
      new Notice(error ?? `Markdown copy written to ${folder}`);
    })();
  }).open();
}

export function encryptProject(app: App): void {
  const draft = currentDraft();
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  new EncryptModal(app, defaultCopyFolder(app, draft.title), (folder, passphrase) => {
    void (async () => {
      const modules = desktop();
      const vault = vaultBase(app);
      if (!modules || !folderOutsideVault(folder, vault)) {
        new Notice("Choose a folder outside the vault.");
        return;
      }
      const sealed = await sealArchive(await projectArchive(app, draft), passphrase);
      if (!sealed) {
        new Notice("The copy was not encrypted.");
        return;
      }
      const destination = modules.path.join(folder, `${safeTitle(draft.title)}.longform-archive.json`);
      modules.fs.mkdirSync(folder, { recursive: true });
      modules.fs.writeFileSync(destination, JSON.stringify(sealed, null, 2), "utf8");
      new Notice("Encrypted copy written. The passphrase stays with you, and the vault was left as it is.");
    })();
  }).open();
}

export function decryptProject(app: App): void {
  new DecryptModal(app, (file, folder, passphrase) => {
    void (async () => {
      const modules = desktop();
      const vault = vaultBase(app);
      if (!modules || !folderOutsideVault(folder, vault)) {
        new Notice("Choose a folder outside the vault.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(modules.fs.readFileSync(file, "utf8"));
      } catch {
        new Notice("That file could not be read.");
        return;
      }
      const envelope = envelopeFrom(parsed);
      if (!envelope) {
        new Notice("That file is not a Longform archive.");
        return;
      }
      const files = await openArchive(envelope, passphrase);
      if (!files) {
        new Notice("The passphrase did not open the copy.");
        return;
      }
      const error = writeTree(folder, files, vault);
      new Notice(error ?? `Markdown restored to ${folder}`);
    })();
  }).open();
}

export function indexWords(app: App, draft: Draft): string[] {
  const file = app.vault.getAbstractFileByPath(draft.vaultPath);
  if (!(file instanceof TFile)) {
    return [];
  }
  return wordsIn(app.metadataCache.getFileCache(file)?.frontmatter);
}

export function learnedNames(draft: Draft): string[] {
  const lists: string[][] = [];
  for (const card of cardsForProject(get(bibleCards), draft.title)) {
    if (card.kind === "person" || card.kind === "place" || card.kind === "world") {
      lists.push(card.names);
    }
  }
  return bookDictionary([], lists);
}

function wordAtCursor(line: string, ch: number): string {
  let start = ch;
  let end = ch;
  const letter = /[A-Za-z\u00C0-\u024F]/;
  while (start > 0 && letter.test(line.charAt(start - 1))) {
    start -= 1;
  }
  while (end < line.length && letter.test(line.charAt(end))) {
    end += 1;
  }
  return line.slice(start, end);
}

export async function addBookWord(app: App): Promise<void> {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const draft = view?.file ? draftForPath(view.file.path, get(drafts)) : null;
  if (!view?.file || !draft) {
    new Notice("Open a Longform page first.");
    return;
  }
  const selected = view.editor.getSelection().trim();
  const cursor = view.editor.getCursor();
  const word = selected.length > 0 ? selected : wordAtCursor(view.editor.getLine(cursor.line), cursor.ch);
  if (word.length < 2 || /\s/.test(word)) {
    new Notice("Select one word from the book.");
    return;
  }
  const index = app.vault.getAbstractFileByPath(draft.vaultPath);
  if (!(index instanceof TFile)) {
    return;
  }
  const current = indexWords(app, draft);
  const key = word.toLocaleLowerCase("pt-BR");
  for (const item of current) {
    if (item.toLocaleLowerCase("pt-BR") === key) {
      new Notice(`${word} is already in the book dictionary.`);
      return;
    }
  }
  await app.fileManager.processFrontMatter(index, (frontmatter) => {
    frontmatter[WORD_KEY] = current.concat(word);
  });
  new Notice(`${word} was added to the book dictionary. The page was left as it is.`);
}

export async function removeBookWord(app: App, word: string): Promise<void> {
  const draft = currentDraft();
  if (!draft) {
    return;
  }
  const index = app.vault.getAbstractFileByPath(draft.vaultPath);
  if (!(index instanceof TFile)) {
    return;
  }
  const next = withoutWord(indexWords(app, draft), word);
  await app.fileManager.processFrontMatter(index, (frontmatter) => {
    frontmatter[WORD_KEY] = next;
  });
}

export function countSyllables(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file || !draftForPath(view.file.path, get(drafts))) {
    new Notice("Open a Longform page first.");
    return;
  }
  const selected = view.editor.getSelection();
  const text = selected.length > 0 ? selected : view.editor.getLine(view.editor.getCursor().line);
  const count = syllablesInText(text);
  new Notice(`${count} Portuguese syllable${count === 1 ? "" : "s"}.`);
}

export function announcePage(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file || !draftForPath(view.file.path, get(drafts))) {
    new Notice("Open a Longform page first.");
    return;
  }
  const pattern = /[0-9A-Za-z\u00C0-\u024F]+/g;
  let words = 0;
  while (pattern.exec(view.editor.getValue())) {
    words += 1;
  }
  announce(`${view.file.basename}. ${words} words.`);
}

async function requestSuggestion(kind: SuggestionKind, passage: string): Promise<string | null> {
  const settings = get(pluginSettings);
  const endpoint = settings.suggestionEndpoint.trim();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = settings.suggestionKey.trim();
    if (key.length > 0) {
      headers.Authorization = `Bearer ${key}`;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.suggestionModel.trim() || "local",
        messages: suggestionMessages(kind, passage),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return readSuggestionReply(await response.json());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function askAboutPassage(app: App, kind: SuggestionKind): Promise<void> {
  const settings = get(pluginSettings);
  if (!settings.suggestions) {
    new Notice("Suggestions are off. The page was left as it is.");
    return;
  }
  if (settings.suggestionEndpoint.trim().length === 0) {
    new Notice("Set the address of a local model, or of a service whose key you hold.");
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const passage = view?.editor.getSelection() ?? "";
  if (!view?.file || !draftForPath(view.file.path, get(drafts)) || passage.trim().length === 0) {
    new Notice("Select a passage first. The page was left as it is.");
    return;
  }
  if (passage.length > 8000) {
    new Notice("Select a shorter passage. The page was left as it is.");
    return;
  }
  const reply = await requestSuggestion(kind, passage);
  if (!reply) {
    new Notice("No reply came back. The page was left as it is.");
    return;
  }
  new SuggestionModal(app, reply).open();
}

export const backupThisProject: CommandBuilder = (plugin) => ({
  id: "longform-backup-project",
  name: "Back up this project",
  callback: () => {
    void backupProject(plugin.app);
  },
});

export const exportThisProject: CommandBuilder = (plugin) => ({
  id: "longform-export-project",
  name: "Export this project",
  callback: () => {
    exportProject(plugin.app);
  },
});

export const encryptThisCopy: CommandBuilder = (plugin) => ({
  id: "longform-encrypt-copy",
  name: "Encrypt a copy",
  callback: () => {
    encryptProject(plugin.app);
  },
});

export const decryptThisCopy: CommandBuilder = (plugin) => ({
  id: "longform-decrypt-copy",
  name: "Decrypt a copy",
  callback: () => {
    decryptProject(plugin.app);
  },
});

export const addThisWord: CommandBuilder = (plugin) => ({
  id: "longform-add-book-word",
  name: "Add this word to the book",
  editorCheckCallback(checking, editor, view) {
    const file = view.file;
    if (!file || !draftForPath(file.path, get(drafts))) {
      return false;
    }
    const selected = editor.getSelection().trim();
    const cursor = editor.getCursor();
    const word = selected.length > 0 ? selected : wordAtCursor(editor.getLine(cursor.line), cursor.ch);
    if (word.length < 2) {
      return false;
    }
    if (checking) {
      return true;
    }
    void addBookWord(plugin.app);
  },
});

export const countPortugueseSyllables: CommandBuilder = (plugin) => ({
  id: "longform-count-syllables",
  name: "Count syllables",
  editorCheckCallback(checking, _editor, view) {
    if (!view.file || !draftForPath(view.file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    countSyllables(plugin.app);
  },
});

export const announceThisPage: CommandBuilder = (plugin) => ({
  id: "longform-announce-page",
  name: "Announce this page",
  callback: () => {
    announcePage(plugin.app);
  },
});

export const askThisPassage: CommandBuilder = (plugin) => ({
  id: "longform-ask-passage",
  name: "Ask about this passage",
  editorCheckCallback(checking, editor, view) {
    if (!view.file || editor.getSelection().trim().length === 0 || !draftForPath(view.file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    new AskKindModal(plugin.app, (kind) => {
      void askAboutPassage(plugin.app, kind);
    }).open();
  },
});

export async function searchProject(app: App, query: string) {
  const draft = currentDraft();
  if (!draft) {
    return [];
  }
  return searchPieces(await projectPieces(app, draft), query);
}
