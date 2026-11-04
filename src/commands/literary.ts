import { MarkdownView, Notice, TFile, normalizePath, type App } from "obsidian";
import { get } from "svelte/store";

import {
  EMPTY_CONTEST,
  EMPTY_RIGHTS,
  epubFiles,
  newContractId,
  newEditionId,
  newSubmissionId,
  newVenueId,
  rightsBlock,
  simultaneousConflict,
  stableLinkNote,
  submissionsForProject,
  todayStamp,
  venueById,
  zipStore,
  type SubmissionStatus,
  type Venue,
} from "src/model/literary";
import { createNote } from "src/model/note-utils";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import type { Draft } from "src/model/types";
import {
  AskTextModal,
  ContestModal,
  ContractModal,
  CoverModal,
  RightsModal,
  VenueModal,
} from "src/view/literary/literary-modals";
import { literaryLedger } from "src/view/literary-ledger";

import type { CommandBuilder } from "./types";

function activePiece(app: App): { draft: Draft; file: TFile } | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file) {
    return null;
  }
  const draft = draftForPath(view.file.path, get(drafts));
  if (!draft) {
    return null;
  }
  return { draft, file: view.file };
}

function exclusiveUntilDays(days: number, from = new Date()): string {
  if (days <= 0) {
    return "";
  }
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  return todayStamp(date);
}

export function addVenue(app: App): void {
  const ledger = literaryLedger();
  if (!ledger) {
    return;
  }
  new VenueModal(app, null, (value) => {
    ledger.addVenue({
      id: newVenueId(),
      name: value.name,
      kind: value.kind,
      simultaneous: value.simultaneous,
      exclusivityDays: value.exclusivityDays,
      notes: value.notes,
    });
    ledger.flush();
    new Notice(`${value.name} was added.`);
  }).open();
}

export function editVenue(app: App, venue: Venue): void {
  const ledger = literaryLedger();
  if (!ledger) {
    return;
  }
  new VenueModal(app, venue, (value) => {
    ledger.updateVenue({
      id: venue.id,
      name: value.name,
      kind: value.kind,
      simultaneous: value.simultaneous,
      exclusivityDays: value.exclusivityDays,
      notes: value.notes,
    });
    ledger.flush();
  }).open();
}

export async function preparePiece(app: App, venueId: string): Promise<void> {
  const ledger = literaryLedger();
  const piece = activePiece(app);
  if (!ledger || !piece) {
    new Notice("Open a Longform page first.");
    return;
  }
  const venue = venueById(ledger.venues, venueId);
  if (!venue) {
    new Notice("Choose a venue first.");
    return;
  }
  const conflict = simultaneousConflict(
    ledger.venues,
    ledger.submissions,
    piece.file.path,
    venueId
  );
  if (conflict) {
    new Notice(conflict);
    return;
  }
  const rights = rightsBlock(ledger.submissions, piece.file.path, todayStamp());
  if (rights) {
    new Notice(rights);
    return;
  }
  const id = newSubmissionId();
  ledger.addSubmission({
    id,
    project: piece.draft.title,
    piecePath: piece.file.path,
    pieceTitle: piece.file.basename,
    venueId,
    preparedAt: Date.now(),
    rights: { ...EMPTY_RIGHTS },
    contest:
      venue.kind === "contest"
        ? { ...EMPTY_CONTEST }
        : { ...EMPTY_CONTEST },
  });
  ledger.flush();
  new Notice(`Prepared for ${venue.name}. The page was left as it is.`);
}

export async function sendSubmission(app: App, id: string): Promise<void> {
  const ledger = literaryLedger();
  if (!ledger) {
    return;
  }
  const submission = ledger.submissions.find((item) => item.id === id);
  if (!submission) {
    return;
  }
  const conflict = simultaneousConflict(
    ledger.venues,
    ledger.submissions,
    submission.piecePath,
    submission.venueId,
    id
  );
  if (conflict) {
    new Notice(conflict);
    return;
  }
  const rights = rightsBlock(ledger.submissions, submission.piecePath, todayStamp());
  if (rights && submission.status === "prepared") {
    new Notice(rights);
    return;
  }
  const file = app.vault.getAbstractFileByPath(submission.piecePath);
  if (!(file instanceof TFile)) {
    new Notice("That piece is no longer in the vault.");
    return;
  }
  const text = await app.vault.read(file);
  const frozenPath = `plugins/longform/sent/${id}.md`;
  const folder = `${app.vault.configDir}/plugins/longform/sent`;
  const full = `${folder}/${id}.md`;
  try {
    await app.vault.adapter.mkdir(`${app.vault.configDir}/plugins/longform`);
  } catch {
    // Plugin folder may already exist.
  }
  try {
    await app.vault.adapter.mkdir(folder);
  } catch {
    // Sent folder may already exist.
  }
  await app.vault.adapter.write(full, text);
  ledger.freeze(id, frozenPath);
  ledger.flush();
  new Notice("The sent copy was frozen. Later edits to the draft stay on the draft.");
}

export function setStatus(app: App, id: string, status: SubmissionStatus): void {
  const ledger = literaryLedger();
  if (!ledger) {
    return;
  }
  const submission = ledger.submissions.find((item) => item.id === id);
  if (!submission) {
    return;
  }
  ledger.setStatus(id, status);
  if (status === "accepted") {
    const venue = venueById(ledger.venues, submission.venueId);
    const until = exclusiveUntilDays(venue?.exclusivityDays ?? 0);
    if (until.length > 0 || !submission.rights.first) {
      ledger.setRights(id, {
        ...submission.rights,
        first: true,
        exclusiveUntil: until || submission.rights.exclusiveUntil,
      });
    }
  }
  ledger.flush();
}

export function editRights(app: App, id: string): void {
  const ledger = literaryLedger();
  const submission = ledger?.submissions.find((item) => item.id === id);
  if (!ledger || !submission) {
    return;
  }
  new RightsModal(app, submission.rights, (rights) => {
    ledger.setRights(id, rights);
    ledger.flush();
  }).open();
}

export function editContest(app: App, id: string): void {
  const ledger = literaryLedger();
  const submission = ledger?.submissions.find((item) => item.id === id);
  if (!ledger || !submission) {
    return;
  }
  new ContestModal(app, submission.contest, (contest) => {
    ledger.setContest(id, contest);
    ledger.flush();
  }).open();
}

export function setLink(app: App, id: string): void {
  const ledger = literaryLedger();
  const submission = ledger?.submissions.find((item) => item.id === id);
  if (!ledger || !submission) {
    return;
  }
  new AskTextModal(app, "Stable link", "https://…", (url) => {
    void (async () => {
      ledger.setUrl(id, url);
      ledger.flush();
      if (url.trim().length === 0) {
        return;
      }
      const venue = venueById(ledger.venues, submission.venueId);
      const folder = normalizePath(`${submission.project}/Published`);
      const path = normalizePath(`${folder}/${submission.pieceTitle}.md`);
      const existing = app.vault.getAbstractFileByPath(path);
      const body = stableLinkNote(
        submission.pieceTitle,
        url.trim(),
        venue?.name ?? ""
      );
      if (existing instanceof TFile) {
        await app.vault.modify(existing, body);
        await app.workspace.getLeaf(false).openFile(existing);
      } else {
        const created = await createNote(app, path, body);
        if (created) {
          await app.workspace.getLeaf(false).openFile(created);
        }
      }
      new Notice("A stable address note was kept beside the project.");
    })();
  }).open();
}

export async function openFrozen(app: App, id: string): Promise<void> {
  const ledger = literaryLedger();
  const submission = ledger?.submissions.find((item) => item.id === id);
  if (!ledger || !submission || submission.frozenPath.length === 0) {
    new Notice("No frozen copy yet.");
    return;
  }
  const full = `${app.vault.configDir}/${submission.frozenPath}`;
  try {
    const text = await app.vault.adapter.read(full);
    const folder = normalizePath(`${submission.project}/Sent`);
    const path = normalizePath(`${folder}/${submission.pieceTitle} sent.md`);
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

export function addContract(app: App): void {
  const ledger = literaryLedger();
  const piece = activePiece(app);
  if (!ledger || !piece) {
    new Notice("Open a Longform page first.");
    return;
  }
  new ContractModal(app, (value) => {
    ledger.addContract({
      id: newContractId(),
      project: piece.draft.title,
      piecePath: piece.file.path,
      pieceTitle: piece.file.basename,
      with: value.with,
      amount: value.amount,
      when: value.when,
      note: value.note,
    });
    ledger.flush();
    new Notice("Contract recorded. The page was left as it is.");
  }).open();
}

async function projectBodies(app: App, draft: Draft): Promise<{ title: string; text: string; path: string }[]> {
  const parts: { title: string; text: string; path: string }[] = [];
  if (draft.format === "scenes") {
    for (const scene of draft.scenes) {
      const path = scenePath(scene.title, draft, app.vault);
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        continue;
      }
      parts.push({ title: scene.title, text: await app.vault.read(file), path });
    }
  } else {
    const file = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (file instanceof TFile) {
      parts.push({
        title: draft.title,
        text: await app.vault.read(file),
        path: draft.vaultPath,
      });
    }
  }
  return parts;
}

function mediaType(path: string): string {
  const lower = path.toLocaleLowerCase("pt-BR");
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
}

export function buildEdition(app: App): void {
  const draft = get(selectedDraft);
  const ledger = literaryLedger();
  if (!draft || !ledger) {
    new Notice("Open a Longform project first.");
    return;
  }
  new CoverModal(app, (coverPath, title) => {
    void (async () => {
      const bodies = await projectBodies(app, draft);
      if (bodies.length === 0) {
        new Notice("This project has no scenes to put in the body.");
        return;
      }
      let cover:
        | { path: string; mediaType: string; bytes: Uint8Array }
        | undefined;
      if (coverPath.length > 0) {
        const file = app.vault.getAbstractFileByPath(normalizePath(coverPath));
        if (!(file instanceof TFile)) {
          new Notice("That cover image was not found.");
          return;
        }
        const bytes = await app.vault.readBinary(file);
        cover = {
          path: file.name,
          mediaType: mediaType(file.path),
          bytes: new Uint8Array(bytes),
        };
      }
      const bookTitle = title.length > 0 ? title : draft.title;
      const files = epubFiles(
        bookTitle,
        draft.title,
        bodies.map((part) => ({ title: part.title, text: part.text })),
        cover
      );
      const zip = zipStore(files);
      const folder = normalizePath(`${draft.title}/Editions`);
      const epubName = `${bookTitle.replace(/[<>:"/\\|?*]/g, " ").trim() || "book"}.epub`;
      const epubPath = normalizePath(`${folder}/${epubName}`);
      try {
        await app.vault.adapter.mkdir(folder);
      } catch {
        // Folder may exist.
      }
      const bytes = new Uint8Array(zip.byteLength);
      bytes.set(zip);
      await app.vault.adapter.writeBinary(epubPath, bytes.buffer);
      ledger.addEdition({
        id: newEditionId(),
        project: draft.title,
        title: bookTitle,
        coverPath,
        bodyPaths: bodies.map((part) => part.path),
        epubPath,
        at: Date.now(),
      });
      ledger.flush();
      new Notice(`EPUB written to ${epubPath}. Cover and body stay apart.`);
    })();
  }).open();
}

export const prepareSubmissionCommand: CommandBuilder = (plugin) => ({
  id: "longform-prepare-submission",
  name: "Prepare a submission",
  callback: () => {
    const ledger = literaryLedger();
    if (!ledger || ledger.venues.length === 0) {
      new Notice("Add a venue in the Life tab first.");
      return;
    }
    const names = ledger.venues.map((venue) => venue.name);
    new AskTextModal(plugin.app, "Venue name", names[0] ?? "Revista", (name) => {
      const venue = ledger.venues.find(
        (item) => item.name.toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR")
      );
      if (!venue) {
        new Notice("No venue with that name.");
        return;
      }
      void preparePiece(plugin.app, venue.id);
    }).open();
  },
});

export const recordContractCommand: CommandBuilder = (plugin) => ({
  id: "longform-record-contract",
  name: "Record a contract",
  callback: () => {
    addContract(plugin.app);
  },
});

export const buildEpubCommand: CommandBuilder = (plugin) => ({
  id: "longform-build-epub",
  name: "Build cover and EPUB",
  callback: () => {
    buildEdition(plugin.app);
  },
});

export function projectSubmissions(project: string) {
  const ledger = literaryLedger();
  if (!ledger) {
    return [];
  }
  return submissionsForProject(ledger.submissions, project);
}
