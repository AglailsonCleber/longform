import { Modal, TextComponent, type App } from "obsidian";

export class FolderModal extends Modal {
  constructor(
    app: App,
    private readonly heading: string,
    private readonly initial: string,
    private readonly onFolder: (folder: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.heading });
    contentEl.createEl("p", {
      text: "A folder on this computer, outside the vault. The copy is Markdown.",
    });
    const input = new TextComponent(contentEl);
    input.setValue(this.initial);
    input.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.close();
        this.onFolder(input.getValue().trim());
      }
    });
    const button = contentEl.createEl("button", { text: "Copy" });
    button.addEventListener("click", () => {
      this.close();
      this.onFolder(input.getValue().trim());
    });
    input.inputEl.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class EncryptModal extends Modal {
  constructor(
    app: App,
    private readonly initial: string,
    private readonly onSeal: (folder: string, passphrase: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Encrypt a copy" });
    contentEl.createEl("p", {
      text: "The passphrase is not saved. Longform does not upload the book.",
    });
    const folder = new TextComponent(contentEl);
    folder.setValue(this.initial);
    folder.setPlaceholder("Folder outside the vault");
    const first = new TextComponent(contentEl);
    first.inputEl.type = "password";
    first.setPlaceholder("Passphrase");
    const again = new TextComponent(contentEl);
    again.inputEl.type = "password";
    again.setPlaceholder("Passphrase again");
    const button = contentEl.createEl("button", { text: "Encrypt" });
    button.addEventListener("click", () => {
      if (first.getValue() !== again.getValue() || first.getValue().length === 0) {
        contentEl.createEl("p", { text: "Type the same passphrase twice." });
        return;
      }
      const passphrase = first.getValue();
      const destination = folder.getValue().trim();
      this.close();
      this.onSeal(destination, passphrase);
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class DecryptModal extends Modal {
  constructor(
    app: App,
    private readonly onOpenArchive: (file: string, folder: string, passphrase: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Decrypt a copy" });
    const file = new TextComponent(contentEl);
    file.setPlaceholder("Path to the .json copy");
    const folder = new TextComponent(contentEl);
    folder.setPlaceholder("Folder for the Markdown");
    const passphrase = new TextComponent(contentEl);
    passphrase.inputEl.type = "password";
    passphrase.setPlaceholder("Passphrase");
    const button = contentEl.createEl("button", { text: "Decrypt" });
    button.addEventListener("click", () => {
      const secret = passphrase.getValue();
      const source = file.getValue().trim();
      const destination = folder.getValue().trim();
      this.close();
      this.onOpenArchive(source, destination, secret);
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SuggestionModal extends Modal {
  constructor(
    app: App,
    private readonly reply: string
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "A reading of the passage" });
    contentEl.createEl("p", { text: "The page was left as it is." });
    const box = contentEl.createEl("textarea");
    box.value = this.reply;
    box.readOnly = true;
    box.rows = 12;
    box.style.width = "100%";
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class AskKindModal extends Modal {
  constructor(
    app: App,
    private readonly onKind: (kind: "suggestion" | "critique") => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Ask about this passage" });
    contentEl.createEl("p", {
      text: "The reply stays in this window. Nothing is written into the page.",
    });
    const suggest = contentEl.createEl("button", { text: "Suggestion" });
    const critique = contentEl.createEl("button", { text: "Critique" });
    suggest.addEventListener("click", () => {
      this.close();
      this.onKind("suggestion");
    });
    critique.addEventListener("click", () => {
      this.close();
      this.onKind("critique");
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
