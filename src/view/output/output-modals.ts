import { Modal, Setting, type App } from "obsidian";

import type { BookOpening, SceneSeparatorKind } from "src/model/output";

export class OpeningModal extends Modal {
  constructor(
    app: App,
    private readonly initial: BookOpening,
    private readonly onSave: (opening: BookOpening) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Book opening" });
    contentEl.createEl("p", {
      text: "Title page, dedication, and epigraph sit on the project index, outside the scenes.",
    });
    let author = this.initial.author;
    let dedication = this.initial.dedication;
    let epigraph = this.initial.epigraph;
    let epigraphSource = this.initial.epigraphSource;
    new Setting(contentEl).setName("Author").addText((input) => {
      input.setValue(author).onChange((value) => {
        author = value;
      });
    });
    new Setting(contentEl).setName("Dedication").addTextArea((input) => {
      input.setValue(dedication).onChange((value) => {
        dedication = value;
      });
    });
    new Setting(contentEl).setName("Epigraph").addTextArea((input) => {
      input.setValue(epigraph).onChange((value) => {
        epigraph = value;
      });
    });
    new Setting(contentEl).setName("Epigraph source").addText((input) => {
      input.setValue(epigraphSource).onChange((value) => {
        epigraphSource = value;
      });
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        this.close();
        this.onSave({
          title: this.initial.title,
          author: author.trim(),
          dedication: dedication.trim(),
          epigraph: epigraph.trim(),
          epigraphSource: epigraphSource.trim(),
        });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SeparatorModal extends Modal {
  constructor(
    app: App,
    private readonly onPick: (kind: SceneSeparatorKind) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Between scenes" });
    const choices: { kind: SceneSeparatorKind; label: string }[] = [
      { kind: "title", label: "Chapter title" },
      { kind: "asterism", label: "Asterism (* * *)" },
      { kind: "none", label: "Nothing" },
    ];
    for (const choice of choices) {
      const button = contentEl.createEl("button", { text: choice.label });
      button.addEventListener("click", () => {
        this.close();
        this.onPick(choice.kind);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
