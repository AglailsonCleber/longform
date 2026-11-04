import { Modal, Setting, TextComponent, type App } from "obsidian";

import {
  WORKSHOP_ROLES,
  type WorkshopRole,
} from "src/model/workshop";

export class InviteModal extends Modal {
  constructor(
    app: App,
    private readonly onSave: (value: { name: string; role: WorkshopRole }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Invite a reader" });
    let name = "";
    let role: WorkshopRole = "beta";
    new Setting(contentEl).setName("Name").addText((input) => {
      input.onChange((value) => {
        name = value;
      });
    });
    new Setting(contentEl)
      .setName("Role")
      .setDesc("Coauthor, editor, beta, or sensitivity reader.")
      .addDropdown((dropdown) => {
        for (const option of WORKSHOP_ROLES) {
          dropdown.addOption(option, option);
        }
        dropdown.setValue(role).onChange((value) => {
          role = value as WorkshopRole;
        });
      });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Invite").setCta().onClick(() => {
        if (name.trim().length === 0) {
          return;
        }
        this.close();
        this.onSave({ name: name.trim(), role });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class DeadlinesModal extends Modal {
  constructor(
    app: App,
    private readonly initial: { critiqueUntil: string; questionsUntil: string; hideCritiques: boolean },
    private readonly onSave: (value: {
      critiqueUntil: string;
      questionsUntil: string;
      hideCritiques: boolean;
    }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Critique and questions" });
    let critiqueUntil = this.initial.critiqueUntil;
    let questionsUntil = this.initial.questionsUntil;
    let hideCritiques = this.initial.hideCritiques;
    new Setting(contentEl)
      .setName("Critique until")
      .setDesc("YYYY-MM-DD. Everyone comments first.")
      .addText((input) => {
        input.setValue(critiqueUntil).onChange((value) => {
          critiqueUntil = value;
        });
      });
    new Setting(contentEl)
      .setName("Questions until")
      .setDesc("YYYY-MM-DD. After critique, only clarify.")
      .addText((input) => {
        input.setValue(questionsUntil).onChange((value) => {
          questionsUntil = value;
        });
      });
    new Setting(contentEl)
      .setName("Hide critiques until delivered")
      .setDesc("A reader cannot see others' critiques before submitting their own.")
      .addToggle((toggle) => {
        toggle.setValue(hideCritiques).onChange((value) => {
          hideCritiques = value;
        });
      });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        this.close();
        this.onSave({
          critiqueUntil: critiqueUntil.trim(),
          questionsUntil: questionsUntil.trim(),
          hideCritiques,
        });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class PassageModal extends Modal {
  constructor(
    app: App,
    private readonly heading: string,
    private readonly passage: string,
    private readonly onSave: (text: string, critique: boolean) => void,
    private readonly allowCritique = true
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.heading });
    if (this.passage.length > 0) {
      contentEl.createEl("p", { text: this.passage });
    }
    let text = "";
    let critique = false;
    new Setting(contentEl).setName("Comment").addTextArea((input) => {
      input.onChange((value) => {
        text = value;
      });
    });
    if (this.allowCritique) {
      new Setting(contentEl)
        .setName("This is my critique delivery")
        .addToggle((toggle) => {
          toggle.setValue(false).onChange((value) => {
            critique = value;
          });
        });
    }
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        if (text.trim().length === 0) {
          return;
        }
        this.close();
        this.onSave(text.trim(), critique);
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SuggestionModal extends Modal {
  constructor(
    app: App,
    private readonly original: string,
    private readonly onSave: (replacement: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Suggest a change" });
    contentEl.createEl("p", { text: this.original });
    contentEl.createEl("p", {
      text: "The draft does not change until the author accepts.",
    });
    const input = new TextComponent(contentEl);
    input.setPlaceholder("Proposed wording");
    const button = contentEl.createEl("button", { text: "Propose" });
    button.addEventListener("click", () => {
      this.close();
      this.onSave(input.getValue());
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class QuestionModal extends Modal {
  constructor(
    app: App,
    private readonly onSave: (prompt: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Question for the betas" });
    const input = new TextComponent(contentEl);
    input.setPlaceholder("What do you want to know?");
    const button = contentEl.createEl("button", { text: "Ask" });
    button.addEventListener("click", () => {
      if (input.getValue().trim().length === 0) {
        return;
      }
      this.close();
      this.onSave(input.getValue().trim());
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class AnswerModal extends Modal {
  constructor(
    app: App,
    private readonly prompt: string,
    private readonly onSave: (text: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Answer" });
    contentEl.createEl("p", { text: this.prompt });
    const input = new TextComponent(contentEl);
    const button = contentEl.createEl("button", { text: "Keep" });
    button.addEventListener("click", () => {
      if (input.getValue().trim().length === 0) {
        return;
      }
      this.close();
      this.onSave(input.getValue().trim());
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ReaderPickModal extends Modal {
  constructor(
    app: App,
    private readonly readers: { id: string; name: string; role: string }[],
    private readonly onPick: (id: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Speak as" });
    for (const reader of this.readers) {
      const button = contentEl.createEl("button", {
        text: `${reader.name} (${reader.role})`,
      });
      button.addEventListener("click", () => {
        this.close();
        this.onPick(reader.id);
      });
    }
    const author = contentEl.createEl("button", { text: "Author" });
    author.addEventListener("click", () => {
      this.close();
      this.onPick("author");
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

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
