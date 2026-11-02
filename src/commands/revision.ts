import { MarkdownView, Notice, TFile, normalizePath, type App } from "obsidian";
import { get } from "svelte/store";

import { cardsForProject } from "src/model/bible";
import { bibleCards } from "src/model/bible-store";
import { createNote } from "src/model/note-utils";
import {
  applyProposal,
  earlierParagraph,
  errandsIn,
  hunksBetween,
  keepHunk,
  missingSceneTitles,
  paragraphSpan,
  treatmentSlips,
  undoHunkInText,
} from "src/model/revision";
import type { Proposal } from "src/model/revision";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft, selectedProject } from "src/model/stores";
import type { MultipleSceneDraft } from "src/model/types";
import { revisionLedger, toggleReaderPath } from "src/view/revision-ledger";
import { syncWritingBar } from "src/view/writing-bar";
import { AskTextModal, ParagraphModal } from "src/view/revision/revision-modals";

import type { CommandBuilder } from "./types";

function longformView(app: App): MarkdownView | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file || !draftForPath(view.file.path, get(drafts))) {
    return null;
  }
  return view;
}

export const nameThisVersion: CommandBuilder = (plugin) => ({
  id: "longform-name-version",
  name: "Name this version",
  callback: () => {
    const view = longformView(plugin.app);
    const ledger = revisionLedger();
    if (!view?.file || !ledger) {
      new Notice("Open a Longform page first.");
      return;
    }
    const path = view.file.path;
    const text = view.editor.getValue();
    new AskTextModal(plugin.app, "Name this version", "Closed", (name) => {
      if (name.trim().length === 0) {
        return;
      }
      ledger.note(path, text, name.trim());
      ledger.flush();
    }).open();
  },
});

export function showEarlierParagraph(app: App): void {
  const view = longformView(app);
  const ledger = revisionLedger();
  if (!view?.file || !ledger) {
    new Notice("Open a Longform page first.");
    return;
  }
  const editor = view.editor;
  const text = editor.getValue();
  const span = paragraphSpan(text, editor.posToOffset(editor.getCursor()));
  if (!span) {
    new Notice("This page has no paragraph here.");
    return;
  }
  const earlier = earlierParagraph(ledger.versions, view.file.path, span.text);
  if (earlier.length === 0) {
    new Notice("No earlier wording is kept for this paragraph.");
    return;
  }
  new ParagraphModal(app, earlier, () => {
    editor.replaceRange(earlier, editor.offsetToPos(span.from), editor.offsetToPos(span.to));
  }).open();
}

export const earlierWording: CommandBuilder = (plugin) => ({
  id: "longform-earlier-paragraph",
  name: "Earlier wording of this paragraph",
  editorCheckCallback(checking, _editor, view) {
    const file = view.file;
    if (!file || !draftForPath(file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    showEarlierParagraph(plugin.app);
  },
});

export const setRevisionMark: CommandBuilder = (plugin) => ({
  id: "longform-revision-mark",
  name: "Set revision mark",
  callback: () => {
    const view = longformView(plugin.app);
    const ledger = revisionLedger();
    if (!view?.file || !ledger) {
      new Notice("Open a Longform page first.");
      return;
    }
    ledger.setMark(view.file.path, view.editor.getValue());
    ledger.flush();
    new Notice("Changes after this moment can be kept or undone one by one.");
  },
});

export function undoMarkedHunk(app: App, index: number): void {
  const view = longformView(app);
  const ledger = revisionLedger();
  if (!view?.file || !ledger) {
    return;
  }
  const mark = ledger.markFor(view.file.path);
  if (!mark) {
    return;
  }
  const hunk = hunksBetween(mark.text, view.editor.getValue())[index];
  if (!hunk) {
    return;
  }
  const next = undoHunkInText(view.editor.getValue(), hunk);
  if (next === null) {
    new Notice("That change could not be put back.");
    return;
  }
  view.editor.setValue(next);
}

export function keepMarkedHunk(app: App, index: number): void {
  const view = longformView(app);
  const ledger = revisionLedger();
  if (!view?.file || !ledger) {
    return;
  }
  const mark = ledger.markFor(view.file.path);
  if (!mark) {
    return;
  }
  ledger.replaceMark(view.file.path, keepHunk(mark.text, view.editor.getValue(), index));
  ledger.flush();
}

export const proposeChange: CommandBuilder = (plugin) => ({
  id: "longform-propose-change",
  name: "Propose a change",
  editorCheckCallback(checking, editor, view) {
    const selected = editor.getSelection();
    const file = view.file;
    if (!file || selected.length === 0 || !draftForPath(file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    new AskTextModal(plugin.app, "Proposed wording", "The replacement", (replacement) => {
      const ledger = revisionLedger();
      if (!ledger) {
        return;
      }
      const proposal: Proposal = {
        id: `${file.path}#${Date.now()}`,
        path: file.path,
        at: Date.now(),
        original: selected,
        replacement,
        status: "pending",
      };
      ledger.addProposal(proposal);
      ledger.flush();
      new Notice("The proposal is waiting. The page was left as it is.");
    }).open();
  },
});

export function decideProposal(app: App, proposal: Proposal, accept: boolean): void {
  const ledger = revisionLedger();
  if (!ledger) {
    return;
  }
  if (!accept) {
    ledger.setProposalStatus(proposal.id, "refused");
    ledger.flush();
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (view?.file?.path !== proposal.path) {
    new Notice("Open the page before accepting the proposal.");
    return;
  }
  const next = applyProposal(view.editor.getValue(), proposal);
  if (next === null) {
    new Notice("That passage is no longer on the page.");
    return;
  }
  view.editor.setValue(next);
  ledger.setProposalStatus(proposal.id, "accepted");
  ledger.flush();
}

export const readAsReader: CommandBuilder = (plugin) => ({
  id: "longform-read-as-reader",
  name: "Read as a reader",
  callback: () => {
    void toggleReader(plugin.app);
  },
});

export async function toggleReader(app: App): Promise<void> {
  const view = longformView(app);
  if (!view?.file) {
    new Notice("Open a Longform page first.");
    return;
  }
  const enabled = toggleReaderPath(view.file.path);
  view.containerEl.classList.toggle("longform-reader", enabled);
  syncWritingBar(view.containerEl, view, !enabled);
  const state = view.getState() as { mode?: string; source?: boolean };
  if (enabled) {
    await view.setState({ ...state, mode: "preview", source: false }, { history: false });
  } else {
    await view.setState({ ...state, mode: "source", source: false }, { history: false });
  }
}

export async function trashPiece(app: App, file: TFile): Promise<void> {
  const ledger = revisionLedger();
  const draft = draftForPath(file.path, get(drafts));
  if (!ledger || !draft) {
    return;
  }
  if (draft.format === "scenes" && file.path === draft.vaultPath) {
    new Notice("The project index stays. Move a scene to the trash.");
    return;
  }
  const text = await app.vault.read(file);
  ledger.addTrash({
    id: `${file.path}#${Date.now()}`,
    path: file.path,
    title: file.basename,
    project: draft.title,
    draftPath: draft.vaultPath,
    at: Date.now(),
    text,
  });
  ledger.flush();
  await app.vault.trash(file, true);
}

export async function restoreTrashed(app: App, id: string): Promise<void> {
  const ledger = revisionLedger();
  if (!ledger) {
    return;
  }
  const piece = ledger.trash.find((item) => item.id === id);
  if (!piece) {
    return;
  }
  let path = piece.path;
  if (app.vault.getAbstractFileByPath(path)) {
    const dot = path.lastIndexOf(".");
    path = `${path.slice(0, dot)} restored${path.slice(dot)}`;
  }
  const file = await createNote(app, path, piece.text);
  if (!file) {
    return;
  }
  const draft = get(drafts).find((item) => item.vaultPath === piece.draftPath);
  if (draft && draft.format === "scenes") {
    const title = file.basename;
    drafts.update((all) =>
      all.map((item) => {
        if (item.vaultPath !== draft.vaultPath || item.format !== "scenes") {
          return item;
        }
        const already = item.scenes.some((scene) => scene.title === title);
        return {
          ...item,
          scenes: already ? item.scenes : [...item.scenes, { title, indent: 0 }],
          unknownFiles: item.unknownFiles.filter((entry) => entry !== title),
        };
      })
    );
  }
  ledger.dropTrash(id);
  ledger.flush();
  await app.workspace.getLeaf(false).openFile(file);
}

export function emptyRevisionTrash(): void {
  revisionLedger()?.emptyTrash();
  revisionLedger()?.flush();
}

export async function bringScene(app: App, from: MultipleSceneDraft, title: string): Promise<void> {
  const current = get(selectedDraft);
  if (!current || current.format !== "scenes") {
    new Notice("Open the draft that should receive the scene.");
    return;
  }
  const source = scenePath(title, from, app.vault);
  const target = scenePath(title, current, app.vault);
  if (!source || !target) {
    return;
  }
  const file = app.vault.getAbstractFileByPath(source);
  if (!(file instanceof TFile)) {
    return;
  }
  if (app.vault.getAbstractFileByPath(target)) {
    new Notice("This draft already has a scene with that name.");
    return;
  }
  const text = await app.vault.read(file);
  const created = await createNote(app, normalizePath(target), text);
  if (!created) {
    return;
  }
  drafts.update((all) =>
    all.map((item) => {
      if (item.vaultPath !== current.vaultPath || item.format !== "scenes") {
        return item;
      }
      return {
        ...item,
        scenes: [...item.scenes, { title, indent: 0 }],
        unknownFiles: item.unknownFiles.filter((entry) => entry !== title),
      };
    })
  );
  await app.workspace.getLeaf(false).openFile(created);
}

export function scenesToBring(): { draft: MultipleSceneDraft; titles: string[] }[] {
  const current = get(selectedDraft);
  const project = get(selectedProject);
  if (!current || current.format !== "scenes" || !project) {
    return [];
  }
  const have = current.scenes.map((scene) => scene.title);
  const found: { draft: MultipleSceneDraft; titles: string[] }[] = [];
  for (const draft of project) {
    if (draft.vaultPath === current.vaultPath || draft.format !== "scenes") {
      continue;
    }
    const titles = missingSceneTitles(
      have,
      draft.scenes.map((scene) => scene.title)
    );
    if (titles.length > 0) {
      found.push({ draft, titles });
    }
  }
  return found;
}

export function pageErrands(text: string) {
  return errandsIn(text);
}

export function pageTreatment(text: string, project: string) {
  const cards = cardsForProject(get(bibleCards), project).filter((card) => card.kind === "person");
  const names: { primary: string; aliases: string[] }[] = [];
  for (const card of cards) {
    const aliases: string[] = [];
    for (let index = 1; index < card.names.length; index += 1) {
      aliases.push(card.names[index]);
    }
    names.push({ primary: card.names[0] ?? "", aliases });
  }
  return treatmentSlips(text, names);
}

export async function jumpToLine(app: App, path: string, line: number): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file);
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || view.file?.path !== path) {
    return;
  }
  const state = view.getState() as { mode?: string; source?: boolean };
  if (state.mode === "preview") {
    await view.setState({ ...state, mode: "source", source: false }, { history: false });
  }
  view.editor.setCursor({ line, ch: 0 });
  view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
}
