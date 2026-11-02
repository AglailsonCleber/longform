import type { App } from "obsidian";

import { readerPaths, proseToggles, revisionTick } from "src/model/revision-store";
import {
  DEFAULT_PROSE,
  recordVersion,
  type Proposal,
  type ProseToggles,
  type SceneVersion,
  type TrashedPiece,
} from "src/model/revision";

export type RevisionMark = {
  path: string;
  at: number;
  text: string;
};

type LedgerFile = {
  versions?: SceneVersion[];
  proposals?: Proposal[];
  trash?: TrashedPiece[];
  marks?: RevisionMark[];
  prose?: ProseToggles;
};

export class RevisionLedger {
  versions: SceneVersion[] = [];
  proposals: Proposal[] = [];
  trash: TrashedPiece[] = [];
  marks: RevisionMark[] = [];
  private timer = 0;
  private loaded: Promise<void>;

  constructor(private app: App) {
    this.loaded = this.read();
  }

  note(path: string, text: string, name = ""): void {
    const next = recordVersion(this.versions, {
      path,
      text,
      at: Date.now(),
      name,
    });
    if (next === this.versions) {
      return;
    }
    this.versions = next;
    this.changed();
  }

  versionsFor(path: string): SceneVersion[] {
    const mine: SceneVersion[] = [];
    for (const version of this.versions) {
      if (version.path === path) {
        mine.push(version);
      }
    }
    mine.sort((left, right) => left.at - right.at);
    return mine;
  }

  markFor(path: string): RevisionMark | null {
    for (let index = this.marks.length - 1; index >= 0; index -= 1) {
      if (this.marks[index].path === path) {
        return this.marks[index];
      }
    }
    return null;
  }

  setMark(path: string, text: string): void {
    this.marks = this.marks.filter((mark) => mark.path !== path);
    this.marks.push({ path, at: Date.now(), text });
    this.changed();
  }

  replaceMark(path: string, text: string): void {
    const current = this.markFor(path);
    this.marks = this.marks.filter((mark) => mark.path !== path);
    this.marks.push({ path, at: current?.at ?? Date.now(), text });
    this.changed();
  }

  addProposal(proposal: Proposal): void {
    this.proposals = this.proposals.concat(proposal).slice(-80);
    this.changed();
  }

  setProposalStatus(id: string, status: Proposal["status"]): void {
    this.proposals = this.proposals.map((proposal) =>
      proposal.id === id ? { ...proposal, status } : proposal
    );
    this.changed();
  }

  addTrash(piece: TrashedPiece): void {
    this.trash = [piece].concat(this.trash).slice(0, 40);
    this.changed();
  }

  dropTrash(id: string): void {
    this.trash = this.trash.filter((piece) => piece.id !== id);
    this.changed();
  }

  emptyTrash(): void {
    this.trash = [];
    this.changed();
  }

  setProse(next: ProseToggles): void {
    proseToggles.set(next);
    this.changed();
  }

  rename(from: string, to: string): void {
    const move = <T extends { path: string }>(item: T): T =>
      item.path === from ? { ...item, path: to } : item;
    this.versions = this.versions.map(move);
    this.proposals = this.proposals.map(move);
    this.marks = this.marks.map(move);
    this.trash = this.trash.map((piece) =>
      piece.path === from ? { ...piece, path: to } : piece
    );
    this.changed();
  }

  flush(): void {
    window.clearTimeout(this.timer);
    void this.write();
  }

  private changed(): void {
    revisionTick.update((tick) => tick + 1);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      void this.write();
    }, 1500);
  }

  private filePath(): string {
    return `${this.app.vault.configDir}/plugins/longform/revisions.json`;
  }

  private async read(): Promise<void> {
    try {
      const raw = await this.app.vault.adapter.read(this.filePath());
      const parsed = JSON.parse(raw) as LedgerFile;
      this.versions = Array.isArray(parsed.versions) ? parsed.versions : [];
      this.proposals = Array.isArray(parsed.proposals) ? parsed.proposals : [];
      this.trash = Array.isArray(parsed.trash) ? parsed.trash : [];
      this.marks = Array.isArray(parsed.marks) ? parsed.marks : [];
      proseToggles.set({ ...DEFAULT_PROSE, ...parsed.prose });
    } catch {
      this.versions = [];
      proseToggles.set({ ...DEFAULT_PROSE });
    }
    revisionTick.update((tick) => tick + 1);
  }

  private async write(): Promise<void> {
    await this.loaded;
    try {
      await this.app.vault.adapter.write(
        this.filePath(),
        JSON.stringify({
          versions: this.versions,
          proposals: this.proposals,
          trash: this.trash,
          marks: this.marks,
          prose: proseTogglesValue(),
        })
      );
    } catch {
      // The manuscript stays in the editor. A failed history copy must not interrupt writing.
    }
  }
}

function proseTogglesValue(): ProseToggles {
  let current = { ...DEFAULT_PROSE };
  proseToggles.subscribe((value) => {
    current = value;
  })();
  return current;
}

let bound: RevisionLedger | null = null;

export function bindRevisionLedger(ledger: RevisionLedger): void {
  bound = ledger;
}

export function revisionLedger(): RevisionLedger | null {
  return bound;
}

export function toggleReaderPath(path: string): boolean {
  let enabled = false;
  readerPaths.update((paths) => {
    if (paths.indexOf(path) >= 0) {
      enabled = false;
      return paths.filter((item) => item !== path);
    }
    enabled = true;
    return paths.concat(path);
  });
  return enabled;
}
