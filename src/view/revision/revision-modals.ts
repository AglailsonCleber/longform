import { Modal, TextComponent, type App } from "obsidian";

export class AskTextModal extends Modal {
  constructor(
    app: App,
    private readonly heading: string,
    private readonly placeholder: string,
    private readonly onText: (value: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.heading });
    const input = new TextComponent(contentEl);
    input.setPlaceholder(this.placeholder);
    const button = contentEl.createEl("button", { text: "Keep" });
    button.addEventListener("click", () => {
      this.close();
      this.onText(input.getValue());
    });
    input.inputEl.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ParagraphModal extends Modal {
  constructor(
    app: App,
    private readonly earlier: string,
    private readonly onRestore: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Earlier wording" });
    contentEl.createEl("p", { text: this.earlier });
    const button = contentEl.createEl("button", { text: "Restore this paragraph" });
    button.addEventListener("click", () => {
      this.close();
      this.onRestore();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
