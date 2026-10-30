import { Modal, type App } from "obsidian";

import type { BesideTarget } from "src/model/page-beside";

const kindLabel: Record<BesideTarget["kind"], string> = {
  page: "Same page",
  draft: "Other draft",
  note: "Project note",
};

export class BesideModal extends Modal {
  constructor(
    app: App,
    private readonly targets: BesideTarget[],
    private readonly onPick: (target: BesideTarget) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Open beside this page" });
    const list = contentEl.createDiv({ cls: "longform-margin-list" });
    for (const target of this.targets) {
      const button = list.createEl("button", {
        cls: "longform-margin-list-item",
        text: `${target.label} — ${kindLabel[target.kind]}`,
      });
      button.addEventListener("click", () => {
        this.close();
        this.onPick(target);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
