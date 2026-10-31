import { Modal, TextComponent, type App } from "obsidian";

type Choice = {
  label: string;
  run: () => void;
};

export class PassageModal extends Modal {
  private value = "";

  constructor(
    app: App,
    private readonly heading: string,
    private readonly placeholder: string,
    private readonly onText: (value: string) => void,
    private readonly choices: Choice[] = []
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.heading });
    if (this.choices.length === 0) {
      const input = new TextComponent(contentEl);
      input.setPlaceholder(this.placeholder);
      input.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          this.value = input.getValue();
          this.close();
          this.onText(this.value);
        }
      });
      const button = contentEl.createEl("button", { text: "Keep" });
      button.addEventListener("click", () => {
        this.close();
        this.onText(input.getValue());
      });
      input.inputEl.focus();
      return;
    }
    for (const choice of this.choices) {
      const button = contentEl.createEl("button", { text: choice.label });
      button.addEventListener("click", () => {
        this.close();
        choice.run();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ClippingModal extends Modal {
  constructor(
    app: App,
    private readonly onKeep: (fields: {
      work: string;
      page: string;
      url: string;
      text: string;
    }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Clipping" });
    const work = contentEl.createEl("input", { type: "text", placeholder: "Work" });
    const page = contentEl.createEl("input", { type: "text", placeholder: "Page" });
    const url = contentEl.createEl("input", { type: "text", placeholder: "URL" });
    const text = contentEl.createEl("textarea", { placeholder: "The passage" });
    const button = contentEl.createEl("button", { text: "Keep" });
    button.addEventListener("click", () => {
      this.close();
      this.onKeep({
        work: work.value,
        page: page.value,
        url: url.value,
        text: text.value,
      });
    });
    work.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ObservationModal extends Modal {
  constructor(
    app: App,
    private readonly onKeep: (fields: { where: string; text: string }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Observation" });
    const where = contentEl.createEl("input", { type: "text", placeholder: "Where" });
    const text = contentEl.createEl("textarea", { placeholder: "What was seen" });
    const button = contentEl.createEl("button", { text: "Keep" });
    button.addEventListener("click", () => {
      this.close();
      this.onKeep({ where: where.value, text: text.value });
    });
    where.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
