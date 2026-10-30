import { Modal, type App } from "obsidian";

import type { MarginNoteHit } from "src/model/margin-note";

export class MarginNotesModal extends Modal {
  constructor(
    app: App,
    private readonly notes: MarginNoteHit[],
    private readonly onPick: (note: MarginNoteHit) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Margin notes" });
    const list = contentEl.createDiv({ cls: "longform-margin-list" });
    for (const note of this.notes) {
      const button = list.createEl("button", {
        cls: "longform-margin-list-item",
        text: note.text.length > 0 ? note.text : "(empty)",
      });
      button.addEventListener("click", () => {
        this.close();
        this.onPick(note);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
