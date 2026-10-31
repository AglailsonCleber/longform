import { Modal, type App } from "obsidian";

export class AskStringModal extends Modal {
  constructor(
    app: App,
    private readonly heading: string,
    private readonly onSubmit: (value: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.heading });
    const input = contentEl.createEl("input", { type: "text" });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.close();
        this.onSubmit(input.value);
      }
    });
    const button = contentEl.createEl("button", { text: "Create" });
    button.addEventListener("click", () => {
      this.close();
      this.onSubmit(input.value);
    });
    input.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ReplaceNameModal extends Modal {
  private fromName: string;

  constructor(
    app: App,
    fromName: string,
    private readonly countFor: (fromName: string, toName: string) => Promise<number>,
    private readonly apply: (fromName: string, toName: string) => Promise<number>
  ) {
    super(app);
    this.fromName = fromName;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Replace a name in the book" });
    contentEl.createEl("p", {
      text: "The card keeps every alias. This changes the manuscript, not the card.",
    });
    const from = contentEl.createEl("input", { type: "text" });
    from.value = this.fromName;
    from.placeholder = "Name in the book";
    const to = contentEl.createEl("input", { type: "text" });
    to.placeholder = "New name";
    const preview = contentEl.createEl("p", { text: "" });
    const look = contentEl.createEl("button", { text: "Count" });
    look.addEventListener("click", () => {
      void this.countFor(from.value, to.value).then((count) => {
        preview.setText(`${count} in the manuscript.`);
      });
    });
    const replace = contentEl.createEl("button", { text: "Replace" });
    replace.addEventListener("click", () => {
      void this.apply(from.value, to.value).then((count) => {
        preview.setText(`Replaced ${count}.`);
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
