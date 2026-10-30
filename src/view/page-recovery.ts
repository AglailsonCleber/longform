import { MarkdownView, Notice, TFile, type App } from "obsidian";

import {
  recoveryOffer,
  rememberSnapshot,
  type PageSnapshot,
} from "src/model/page-recovery";

import { RecoveryModal } from "./RecoveryModal";

export class PageRecovery {
  private notes: PageSnapshot[] = [];
  private pending = new Map<string, PageSnapshot>();
  private timer = 0;
  private offered = new Set<string>();
  private loaded: Promise<void>;

  constructor(private app: App) {
    this.loaded = this.read();
  }

  note(path: string, text: string): void {
    this.pending.set(path, { path, text, at: Date.now() });
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.flush();
    }, 800);
  }

  rename(from: string, to: string): void {
    const pending = this.pending.get(from);
    if (pending) {
      this.pending.delete(from);
      this.pending.set(to, { ...pending, path: to });
    }
    this.notes = this.notes.map((note) =>
      note.path === from ? { ...note, path: to } : note
    );
    if (this.offered.has(from)) {
      this.offered.delete(from);
      this.offered.add(to);
    }
  }

  forget(path: string): void {
    this.pending.delete(path);
    this.notes = this.notes.filter((note) => note.path !== path);
    this.offered.delete(path);
  }

  snapshotFor(path: string): PageSnapshot | null {
    return this.pending.get(path) ?? this.notes.find((note) => note.path === path) ?? null;
  }

  flush(): void {
    window.clearTimeout(this.timer);
    for (const snapshot of this.pending.values()) {
      this.notes = rememberSnapshot(this.notes, snapshot);
    }
    this.pending.clear();
    void this.write();
  }

  async offer(file: TFile, manual = false): Promise<void> {
    await this.loaded;
    const snapshot = this.snapshotFor(file.path);
    const fileText = await this.app.vault.cachedRead(file);
    const offer = recoveryOffer(fileText, file.stat.mtime, snapshot);
    if (!offer) {
      if (manual) {
        new Notice("This page matches the copy Longform kept.");
      }
      return;
    }
    if (!manual && this.offered.has(file.path)) {
      return;
    }
    this.offered.add(file.path);
    new RecoveryModal(this.app, offer.text, {
      onRestore: () => {
        void this.restore(file, offer.text);
      },
      onKeep: () => {
        this.note(file.path, fileText);
        this.flush();
      },
    }).open();
  }

  private async restore(file: TFile, text: string): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file?.path === file.path) {
      view.editor.setValue(text);
    } else {
      await this.app.vault.modify(file, text);
    }
    this.note(file.path, text);
    this.flush();
  }

  private filePath(): string {
    return `${this.app.vault.configDir}/plugins/longform/recovery.json`;
  }

  private async read(): Promise<void> {
    try {
      const raw = await this.app.vault.adapter.read(this.filePath());
      const parsed = JSON.parse(raw) as { notes?: PageSnapshot[] };
      this.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    } catch {
      this.notes = [];
    }
  }

  private async write(): Promise<void> {
    try {
      await this.app.vault.adapter.write(
        this.filePath(),
        JSON.stringify({ notes: this.notes })
      );
    } catch {
      // The manuscript is still in the editor. A failed copy must not interrupt writing.
    }
  }
}
