import { Modal, Setting, TextComponent, type App } from "obsidian";

import {
  VENUE_KINDS,
  type ContestInfo,
  type Rights,
  type Venue,
  type VenueKind,
} from "src/model/literary";

export class VenueModal extends Modal {
  constructor(
    app: App,
    private readonly initial: Venue | null,
    private readonly onSave: (venue: Omit<Venue, "id"> & { id?: string }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.initial ? "Edit venue" : "Add venue" });
    let name = this.initial?.name ?? "";
    let kind: VenueKind = this.initial?.kind ?? "magazine";
    let simultaneous = this.initial?.simultaneous ?? true;
    let exclusivityDays = this.initial?.exclusivityDays ?? 0;
    let notes = this.initial?.notes ?? "";

    new Setting(contentEl).setName("Name").addText((input) => {
      input.setValue(name).onChange((value) => {
        name = value;
      });
    });
    new Setting(contentEl).setName("Kind").addDropdown((dropdown) => {
      for (const option of VENUE_KINDS) {
        dropdown.addOption(option, option);
      }
      dropdown.setValue(kind).onChange((value) => {
        kind = value as VenueKind;
      });
    });
    new Setting(contentEl)
      .setName("Simultaneous submissions")
      .setDesc("Off when this venue expects the piece alone.")
      .addToggle((toggle) => {
        toggle.setValue(simultaneous).onChange((value) => {
          simultaneous = value;
        });
      });
    new Setting(contentEl)
      .setName("Exclusivity days after acceptance")
      .addText((input) => {
        input.setValue(String(exclusivityDays)).onChange((value) => {
          exclusivityDays = Number(value) || 0;
        });
      });
    new Setting(contentEl).setName("Notes").addTextArea((input) => {
      input.setValue(notes).onChange((value) => {
        notes = value;
      });
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        if (name.trim().length === 0) {
          return;
        }
        this.close();
        this.onSave({
          id: this.initial?.id,
          name: name.trim(),
          kind,
          simultaneous,
          exclusivityDays,
          notes: notes.trim(),
        });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ContestModal extends Modal {
  constructor(
    app: App,
    private readonly initial: ContestInfo,
    private readonly onSave: (contest: ContestInfo) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Contest deadline" });
    let deadline = this.initial.deadline;
    let fee = this.initial.fee;
    let rules = this.initial.rules;
    new Setting(contentEl)
      .setName("Deadline")
      .setDesc("YYYY-MM-DD")
      .addText((input) => {
        input.setValue(deadline).onChange((value) => {
          deadline = value;
        });
      });
    new Setting(contentEl).setName("Fee").addText((input) => {
      input.setValue(fee).onChange((value) => {
        fee = value;
      });
    });
    new Setting(contentEl).setName("Rules").addText((input) => {
      input.setPlaceholder("URL or short note").setValue(rules).onChange((value) => {
        rules = value;
      });
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        this.close();
        this.onSave({
          deadline: deadline.trim(),
          fee: fee.trim(),
          rules: rules.trim(),
        });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class RightsModal extends Modal {
  constructor(
    app: App,
    private readonly initial: Rights,
    private readonly onSave: (rights: Rights) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Publication rights" });
    let first = this.initial.first;
    let exclusiveUntil = this.initial.exclusiveUntil;
    let republishFrom = this.initial.republishFrom;
    new Setting(contentEl)
      .setName("First publication")
      .addToggle((toggle) => {
        toggle.setValue(first).onChange((value) => {
          first = value;
        });
      });
    new Setting(contentEl)
      .setName("Exclusive until")
      .setDesc("YYYY-MM-DD")
      .addText((input) => {
        input.setValue(exclusiveUntil).onChange((value) => {
          exclusiveUntil = value;
        });
      });
    new Setting(contentEl)
      .setName("Republication opens")
      .setDesc("YYYY-MM-DD")
      .addText((input) => {
        input.setValue(republishFrom).onChange((value) => {
          republishFrom = value;
        });
      });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        this.close();
        this.onSave({
          first,
          exclusiveUntil: exclusiveUntil.trim(),
          republishFrom: republishFrom.trim(),
        });
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ContractModal extends Modal {
  constructor(
    app: App,
    private readonly onSave: (value: {
      with: string;
      amount: string;
      when: string;
      note: string;
    }) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Contract and payment" });
    contentEl.createEl("p", { text: "A short record. This is not a ledger of accounts." });
    let withWho = "";
    let amount = "";
    let when = "";
    let note = "";
    new Setting(contentEl).setName("With").addText((input) => {
      input.setPlaceholder("Magazine, publisher, or editor").onChange((value) => {
        withWho = value;
      });
    });
    new Setting(contentEl).setName("Amount").addText((input) => {
      input.onChange((value) => {
        amount = value;
      });
    });
    new Setting(contentEl).setName("When").addText((input) => {
      input.setPlaceholder("YYYY-MM-DD").onChange((value) => {
        when = value;
      });
    });
    new Setting(contentEl).setName("Note").addText((input) => {
      input.onChange((value) => {
        note = value;
      });
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Keep").setCta().onClick(() => {
        if (withWho.trim().length === 0) {
          return;
        }
        this.close();
        this.onSave({
          with: withWho.trim(),
          amount: amount.trim(),
          when: when.trim(),
          note: note.trim(),
        });
      });
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
    input.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.close();
        this.onText(input.getValue());
      }
    });
    input.inputEl.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class CoverModal extends Modal {
  constructor(
    app: App,
    private readonly onBuild: (coverPath: string, title: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Cover and EPUB" });
    contentEl.createEl("p", {
      text: "The cover stays a separate image. The body is the current project. Skip this if a publisher handles the book.",
    });
    let title = "";
    let coverPath = "";
    new Setting(contentEl).setName("Title").addText((input) => {
      input.onChange((value) => {
        title = value;
      });
    });
    new Setting(contentEl)
      .setName("Cover image")
      .setDesc("Vault path to a jpg, png, or webp. Leave empty for body only.")
      .addText((input) => {
        input.setPlaceholder("Covers/capa.jpg").onChange((value) => {
          coverPath = value;
        });
      });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Build EPUB").setCta().onClick(() => {
        this.close();
        this.onBuild(coverPath.trim(), title.trim());
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
