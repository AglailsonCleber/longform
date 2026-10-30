import { Modal, type App } from "obsidian";

export class RecoveryModal extends Modal {
  constructor(
    app: App,
    private readonly text: string,
    private readonly actions: {
      onRestore: () => void;
      onKeep: () => void;
    }
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Recovered page" });
    contentEl.createEl("p", {
      text: "Longform kept a newer copy of this page than the file on disk. Restore that copy, or keep what is open now.",
    });
    const words = this.text.trim().length === 0 ? 0 : this.text.trim().split(/\s+/).length;
    contentEl.createEl("p", {
      text: `The kept copy has ${words} words.`,
    });
    const row = contentEl.createDiv({ cls: "longform-recovery-actions" });
    const restore = row.createEl("button", { text: "Restore kept copy" });
    restore.addEventListener("click", () => {
      this.close();
      this.actions.onRestore();
    });
    const keep = row.createEl("button", { text: "Keep current page" });
    keep.addEventListener("click", () => {
      this.close();
      this.actions.onKeep();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
