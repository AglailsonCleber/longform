import { MarkdownView, Notice, TFile, normalizePath, type App } from "obsidian";
import { get } from "svelte/store";

import { createNote } from "src/model/note-utils";
import { draftForPath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import {
  applySuggestion,
  countWords,
  newInviteId,
  newWorkshopId,
  phaseOf,
  rolePowers,
  todayStamp,
  workshopsForProject,
  type Invite,
  type Workshop,
  type WorkshopSuggestion,
} from "src/model/workshop";
import { workshopLedger } from "src/view/workshop-ledger";
import {
  AnswerModal,
  AskTextModal,
  DeadlinesModal,
  InviteModal,
  PassageModal,
  QuestionModal,
  ReaderPickModal,
  SuggestionModal,
} from "src/view/workshop/workshop-modals";

import type { CommandBuilder } from "./types";

function activePiece(app: App): { path: string; title: string; project: string; text: string } | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file) {
    return null;
  }
  const draft = draftForPath(view.file.path, get(drafts));
  if (!draft) {
    return null;
  }
  return {
    path: view.file.path,
    title: view.file.basename,
    project: draft.title,
    text: view.editor.getValue(),
  };
}

async function ensureWorkshopFolder(app: App): Promise<string> {
  const root = `${app.vault.configDir}/plugins/longform`;
  const folder = `${root}/workshop`;
  try {
    await app.vault.adapter.mkdir(root);
  } catch {
    // exists
  }
  try {
    await app.vault.adapter.mkdir(folder);
  } catch {
    // exists
  }
  return folder;
}

export async function openWorkshopRound(app: App): Promise<void> {
  const ledger = workshopLedger();
  const piece = activePiece(app);
  if (!ledger || !piece) {
    new Notice("Open a Longform page first.");
    return;
  }
  new AskTextModal(app, "Workshop round", "Round 1", (title) => {
    void (async () => {
      const id = newWorkshopId();
      const folder = await ensureWorkshopFolder(app);
      const frozenPath = `plugins/longform/workshop/${id}.md`;
      await app.vault.adapter.write(`${folder}/${id}.md`, piece.text);
      const workshop: Workshop = {
        id,
        project: piece.project,
        piecePath: piece.path,
        pieceTitle: piece.title,
        title: title.trim() || "Round",
        frozenPath,
        frozenAt: Date.now(),
        invites: [],
        critiqueUntil: "",
        questionsUntil: "",
        hideCritiques: true,
        genre: "",
        words: countWords(piece.text),
        status: "open",
      };
      ledger.addWorkshop(workshop);
      ledger.flush();
      new Notice(
        "The workshop copy was frozen. Later edits to the draft stay on the draft."
      );
    })();
  }).open();
}

export function inviteReader(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  if (!ledger) {
    return;
  }
  new InviteModal(app, ({ name, role }) => {
    ledger.invite(workshopId, { id: newInviteId(), name, role });
    ledger.flush();
    const powers = rolePowers(role);
    new Notice(
      `${name} invited as ${role}. ${
        powers.canEdit ? "May edit." : powers.canSuggest ? "May suggest." : "May comment."
      }`
    );
  }).open();
}

export function setDeadlines(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  new DeadlinesModal(
    app,
    {
      critiqueUntil: workshop.critiqueUntil,
      questionsUntil: workshop.questionsUntil,
      hideCritiques: workshop.hideCritiques,
    },
    (value) => {
      ledger.updateWorkshop({ ...workshop, ...value });
      ledger.flush();
    }
  ).open();
}

function pickReader(
  app: App,
  workshop: Workshop,
  then: (reader: { id: string; name: string }) => void
): void {
  new ReaderPickModal(
    app,
    workshop.invites.map((invite) => ({
      id: invite.id,
      name: invite.name,
      role: invite.role,
    })),
    (id) => {
      if (id === "author") {
        then({ id: "author", name: "Author" });
        return;
      }
      const invite = workshop.invites.find((item) => item.id === id);
      if (invite) {
        then({ id: invite.id, name: invite.name });
      }
    }
  ).open();
}

export function commentOnPassage(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  const phase = phaseOf(workshop, todayStamp());
  if (phase === "closed") {
    new Notice("This round is closed.");
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const passage = view?.editor.getSelection() ?? "";
  if (passage.trim().length === 0) {
    new Notice("Select the passage the comment should stick to.");
    return;
  }
  pickReader(app, workshop, (reader) => {
    if (reader.id !== "author") {
      const invite = workshop.invites.find((item) => item.id === reader.id) as Invite;
      if (!rolePowers(invite.role).canComment) {
        new Notice("That role cannot comment.");
        return;
      }
    }
    new PassageModal(
      app,
      phase === "questions" ? "Clarify on this passage" : "Comment on this passage",
      passage,
      (text, critique) => {
        if (phase === "questions" && critique) {
          new Notice("Critique delivery is closed. Only clarification now.");
          return;
        }
        ledger.addComment({
          id: `thread-${Date.now()}`,
          workshopId,
          readerId: reader.id,
          readerName: reader.name,
          passage,
          text,
          at: Date.now(),
          parentId: "",
          critique: critique && phase === "critique",
        });
        ledger.flush();
        new Notice("Comment kept on that passage.");
      },
      phase === "critique"
    ).open();
  });
}

export function replyToThread(app: App, workshopId: string, parentId: string, passage: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  pickReader(app, workshop, (reader) => {
    new PassageModal(
      app,
      "Reply on this passage",
      passage,
      (text) => {
        ledger.addComment({
          id: `thread-${Date.now()}`,
          workshopId,
          readerId: reader.id,
          readerName: reader.name,
          passage,
          text,
          at: Date.now(),
          parentId,
          critique: false,
        });
        ledger.flush();
      },
      false
    ).open();
  });
}

export function proposeWorkshopChange(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const original = view?.editor.getSelection() ?? "";
  if (original.length === 0) {
    new Notice("Select the wording to replace.");
    return;
  }
  pickReader(app, workshop, (reader) => {
    if (reader.id !== "author") {
      const invite = workshop.invites.find((item) => item.id === reader.id);
      if (!invite || !rolePowers(invite.role).canSuggest) {
        new Notice("That role cannot propose a change.");
        return;
      }
    }
    new SuggestionModal(app, original, (replacement) => {
      ledger.addSuggestion({
        id: `sug-${Date.now()}`,
        workshopId,
        readerId: reader.id,
        readerName: reader.name,
        original,
        replacement,
        status: "pending",
        at: Date.now(),
      });
      ledger.flush();
      new Notice("The proposal is waiting. The page was left as it is.");
    }).open();
  });
}

export async function decideWorkshopSuggestion(
  app: App,
  suggestion: WorkshopSuggestion,
  accept: boolean
): Promise<void> {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === suggestion.workshopId);
  if (!ledger || !workshop) {
    return;
  }
  if (!accept) {
    ledger.decideSuggestion(suggestion.id, "refused");
    ledger.flush();
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (view?.file?.path !== workshop.piecePath) {
    new Notice("Open the live draft to accept the suggestion.");
    return;
  }
  const next = applySuggestion(view.editor.getValue(), suggestion);
  if (next === null) {
    new Notice("That passage is no longer on the draft.");
    return;
  }
  view.editor.setValue(next);
  ledger.decideSuggestion(suggestion.id, "accepted");
  ledger.flush();
  new Notice("The change entered the draft. The frozen workshop copy was left as it is.");
}

export function askBetaQuestion(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  if (!ledger) {
    return;
  }
  new QuestionModal(app, (prompt) => {
    ledger.addQuestion({
      id: `q-${Date.now()}`,
      workshopId,
      prompt,
      answers: [],
    });
    ledger.flush();
  }).open();
}

export function answerBetaQuestion(app: App, workshopId: string, questionId: string, prompt: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  pickReader(app, workshop, (reader) => {
    if (reader.id !== "author") {
      const invite = workshop.invites.find((item) => item.id === reader.id);
      if (!invite || !rolePowers(invite.role).canAnswer) {
        new Notice("That role cannot answer.");
        return;
      }
    }
    new AnswerModal(app, prompt, (text) => {
      ledger.answerQuestion(questionId, {
        readerId: reader.id,
        readerName: reader.name,
        text,
        at: Date.now(),
      });
      ledger.flush();
    }).open();
  });
}

export function markAttentionDrop(app: App, workshopId: string): void {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop) {
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const passage = view?.editor.getSelection() ?? "";
  if (passage.trim().length === 0) {
    new Notice("Select where the reading cooled.");
    return;
  }
  pickReader(app, workshop, (reader) => {
    new AskTextModal(
      app,
      "Reader consent",
      'Type "yes" to record this drop-off',
      (value) => {
        const consented = value.trim().toLocaleLowerCase("pt-BR") === "yes";
        if (!consented) {
          new Notice("Without consent, the drop-off is not kept.");
          return;
        }
        ledger.addAttention({
          id: `att-${Date.now()}`,
          workshopId,
          readerId: reader.id,
          readerName: reader.name,
          passage,
          consented: true,
          at: Date.now(),
        });
        ledger.flush();
        new Notice("Drop-off recorded with consent.");
      }
    ).open();
  });
}

export async function openFrozenWorkshop(app: App, workshopId: string): Promise<void> {
  const ledger = workshopLedger();
  const workshop = ledger?.workshops.find((item) => item.id === workshopId);
  if (!ledger || !workshop || workshop.frozenPath.length === 0) {
    new Notice("No frozen workshop copy yet.");
    return;
  }
  try {
    const text = await app.vault.adapter.read(
      `${app.vault.configDir}/${workshop.frozenPath}`
    );
    const folder = normalizePath(`${workshop.project}/Workshop`);
    const path = normalizePath(`${folder}/${workshop.pieceTitle} ${workshop.title}.md`);
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await app.vault.modify(existing, text);
      await app.workspace.getLeaf(false).openFile(existing);
      return;
    }
    const created = await createNote(app, path, text);
    if (created) {
      await app.workspace.getLeaf(false).openFile(created);
    }
  } catch {
    new Notice("The frozen copy could not be read.");
  }
}

export function listForSwap(app: App): void {
  const ledger = workshopLedger();
  const piece = activePiece(app);
  if (!ledger || !piece) {
    new Notice("Open a Longform page first.");
    return;
  }
  new AskTextModal(app, "Genre for the queue", "conto", (genre) => {
    const id = `swap-${piece.path}`;
    const existing = ledger.swaps.find((item) => item.id === id);
    ledger.upsertSwap({
      id,
      project: piece.project,
      piecePath: piece.path,
      pieceTitle: piece.title,
      genre: genre.trim() || "other",
      words: countWords(piece.text),
      seeking: existing?.seeking ?? false,
      credit: existing?.credit ?? 0,
    });
    ledger.flush();
    new Notice("Piece registered for the reading swap.");
  }).open();
}

export function markSwapRead(app: App, listingId: string): void {
  const ledger = workshopLedger();
  if (!ledger) {
    return;
  }
  ledger.earnCredit(listingId);
  ledger.flush();
  new Notice("Reading credited. You can enter the queue when you have a credit.");
}

export function enterSwapQueue(app: App, listingId: string): void {
  const ledger = workshopLedger();
  if (!ledger) {
    return;
  }
  if (!ledger.seekSwap(listingId)) {
    new Notice("Read someone else's piece first. Genre and length filter the queue.");
    return;
  }
  ledger.flush();
  new Notice("Your piece entered the queue.");
}

export const openWorkshopCommand: CommandBuilder = (plugin) => ({
  id: "longform-open-workshop",
  name: "Open a workshop round",
  callback: () => {
    void openWorkshopRound(plugin.app);
  },
});

export const workshopCommentCommand: CommandBuilder = (plugin) => ({
  id: "longform-workshop-comment",
  name: "Comment on a workshop passage",
  editorCheckCallback(checking, editor, view) {
    if (!view.file || editor.getSelection().length === 0 || !draftForPath(view.file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    const draft = get(selectedDraft);
    const ledger = workshopLedger();
    const open = draft && ledger
      ? workshopsForProject(ledger.workshops, draft.title).find((item) => item.status === "open")
      : null;
    if (!open) {
      new Notice("Open a workshop round first.");
      return;
    }
    commentOnPassage(plugin.app, open.id);
  },
});

export const workshopSuggestCommand: CommandBuilder = (plugin) => ({
  id: "longform-workshop-suggest",
  name: "Suggest a workshop change",
  editorCheckCallback(checking, editor, view) {
    if (!view.file || editor.getSelection().length === 0 || !draftForPath(view.file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    const draft = get(selectedDraft);
    const ledger = workshopLedger();
    const open = draft && ledger
      ? workshopsForProject(ledger.workshops, draft.title).find((item) => item.status === "open")
      : null;
    if (!open) {
      new Notice("Open a workshop round first.");
      return;
    }
    proposeWorkshopChange(plugin.app, open.id);
  },
});
