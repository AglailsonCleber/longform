import { ItemView, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";

import {
  cursorInsideMarginNote,
  marginNotesInDocument,
  marginNotesInLine,
  type MarginNoteHit,
} from "src/model/margin-note";
import { insertMissingWordInto } from "src/commands/missing-word";
import { insertDialogueDashInto, insertQuotesInto } from "src/commands/portuguese";
import { missingWordsInDocument } from "src/model/missing-word";
import {
  insertCharacterCue,
  insertParenthetical,
  insertSceneHeading,
  insertStanza,
  PAGE_FORM_KEY,
  pageForm,
  setNoteForm,
} from "src/model/page-form";
import type { PageForm } from "src/model/page-form";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import type { Draft } from "src/model/types";
import { activeFile } from "src/view/stores";
import { get, type Unsubscriber } from "svelte/store";

import NotesPaneView from "./NotesPaneView.svelte";

export const VIEW_TYPE_LONGFORM_NOTES = "VIEW_TYPE_LONGFORM_NOTES";

export type PrivateComment = MarginNoteHit & {
  path: string;
  title: string;
};

export class NotesPane extends ItemView {
  private pane: NotesPaneView | null = null;
  private generation = 0;
  private timer = 0;
  private unsubscribers: Unsubscriber[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_LONGFORM_NOTES;
  }

  getDisplayText(): string {
    return "Private comments";
  }

  getIcon(): string {
    return "longform";
  }

  async onOpen(): Promise<void> {
    this.pane = new NotesPaneView({
      target: this.contentEl,
      props: {
        comments: [] as PrivateComment[],
        missingWords: [] as PrivateComment[],
        project: "",
        form: "prose" as PageForm,
        onOpen: (comment: PrivateComment) => {
          void this.openPlace(comment);
        },
        onForm: (form: PageForm) => {
          void this.chooseForm(form);
        },
        onStanza: () => this.editNote(insertStanza),
        onScene: () => this.editNote(insertSceneHeading),
        onCharacter: () => this.editNote(insertCharacterCue),
        onParenthetical: () => this.editNote(insertParenthetical),
        onDash: () => this.editNote(insertDialogueDashInto),
        onQuotes: () => this.editNote(insertQuotesInto),
        onMissing: () => this.editNote(insertMissingWordInto),
      },
    });

    const queue = () => this.queueRefresh();
    this.unsubscribers.push(activeFile.subscribe(queue));
    this.unsubscribers.push(drafts.subscribe(queue));
    this.unsubscribers.push(selectedDraft.subscribe(queue));
    this.registerEvent(this.app.vault.on("modify", queue));
    this.registerEvent(this.app.metadataCache.on("changed", queue));
    this.registerEvent(this.app.workspace.on("editor-change", queue));
    this.queueRefresh();
  }

  async onClose(): Promise<void> {
    window.clearTimeout(this.timer);
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.pane?.$destroy();
    this.pane = null;
  }

  private queueRefresh(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      void this.refresh();
    }, 150);
  }

  private currentDraft(): Draft | null {
    const file = get(activeFile);
    const all = get(drafts);
    if (file) {
      const open = draftForPath(file.path, all);
      if (open) {
        return open;
      }
    }
    return get(selectedDraft);
  }

  private async refresh(): Promise<void> {
    const generation = ++this.generation;
    const draft = this.currentDraft();
    if (!draft || !this.pane) {
      this.pane?.$set({
        comments: [],
        missingWords: [],
        project: "",
        form: "prose",
      });
      return;
    }

    const paths =
      draft.format === "single"
        ? [draft.vaultPath]
        : draft.scenes.map((scene) =>
            scenePath(scene.title, draft, this.app.vault)
          );

    const comments: PrivateComment[] = [];
    const missingWords: PrivateComment[] = [];
    for (const path of paths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        continue;
      }
      let text = await this.app.vault.cachedRead(file);
      const active = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (active?.file?.path === path && active.getMode() !== "preview") {
        text = active.editor.getValue();
      }
      if (generation !== this.generation) {
        return;
      }
      for (const note of marginNotesInDocument(text)) {
        comments.push({
          path,
          title: file.basename,
          line: note.line,
          ch: note.ch,
          text: note.text,
        });
      }
      for (const word of missingWordsInDocument(text)) {
        missingWords.push({
          path,
          title: file.basename,
          line: word.line,
          ch: word.ch,
          text: word.text,
        });
      }
    }

    if (generation !== this.generation || !this.pane) {
      return;
    }
    this.pane.$set({
      comments,
      missingWords,
      project: draft.title,
      form: this.openForm(),
    });
  }

  private openFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) {
      return null;
    }
    if (!draftForPath(file.path, get(drafts))) {
      return null;
    }
    return file;
  }

  private openForm(): PageForm {
    const file = this.openFile();
    if (!file) {
      return "prose";
    }
    return pageForm(
      this.app.metadataCache.getFileCache(file)?.frontmatter?.[PAGE_FORM_KEY]
    );
  }

  private async chooseForm(form: PageForm): Promise<void> {
    const file = this.openFile();
    if (!file) {
      return;
    }
    await setNoteForm(this.app, file, form);
  }

  private editNote(edit: (editor: MarkdownView["editor"]) => void): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== this.openFile()?.path) {
      return;
    }
    edit(view.editor);
    view.editor.focus();
  }

  private async openPlace(comment: PrivateComment): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(comment.path);
    if (!(file instanceof TFile)) {
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file?.path !== comment.path) {
      return;
    }
    const line = view.editor.getLine(comment.line);
    const match = marginNotesInLine(line).find((note) => note.from === comment.ch);
    const ch = match ? cursorInsideMarginNote(line, match) : comment.ch;
    view.editor.setCursor({ line: comment.line, ch });
    view.editor.scrollIntoView(
      {
        from: { line: comment.line, ch: 0 },
        to: { line: comment.line, ch: 0 },
      },
      true
    );
  }
}
