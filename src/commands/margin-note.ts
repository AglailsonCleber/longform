import { Notice, type MarkdownFileInfo, type MarkdownView } from "obsidian";
import { get } from "svelte/store";

import {
  cursorInsideMarginNote,
  lineForMarginNote,
  marginNoteEdit,
  marginNotesInDocument,
  marginNotesInLine,
} from "src/model/margin-note";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";
import { MarginNotesModal } from "src/view/MarginNotesModal";

import type { CommandBuilder } from "./types";

function isLongformFile(view: MarkdownView | MarkdownFileInfo): boolean {
  const path = view.file?.path;
  if (!path) {
    return false;
  }
  return draftForPath(path, get(drafts)) !== null;
}

export const insertMarginNote: CommandBuilder = () => ({
  id: "longform-insert-margin-note",
  name: "Insert margin note",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }

    const lines = editor.getValue().split(/\r?\n/);
    let lineNo = lineForMarginNote(lines, editor.getCursor().line);
    if (lineNo >= editor.lineCount()) {
      const last = Math.max(0, editor.lineCount() - 1);
      editor.replaceRange("\n", {
        line: last,
        ch: editor.getLine(last).length,
      });
      lineNo = last + 1;
    }

    const cursor = editor.getCursor();
    const ch = lineNo === cursor.line ? cursor.ch : editor.getLine(lineNo).length;
    const edited = marginNoteEdit(editor.getLine(lineNo), ch);
    editor.setLine(lineNo, edited.line);
    editor.setCursor({ line: lineNo, ch: edited.cursor });
  },
});

export const listMarginNotes: CommandBuilder = (plugin) => ({
  id: "longform-list-margin-notes",
  name: "List margin notes",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }

    const notes = marginNotesInDocument(editor.getValue());
    if (notes.length === 0) {
      new Notice("This scene has no margin notes.");
      return;
    }

    new MarginNotesModal(plugin.app, notes, (note) => {
      const line = editor.getLine(note.line);
      const match = marginNotesInLine(line).find((item) => item.from === note.ch);
      const ch = match ? cursorInsideMarginNote(line, match) : note.ch;
      editor.setCursor({ line: note.line, ch });
    }).open();
  },
});

export const showPrivateComments: CommandBuilder = (plugin) => ({
  id: "longform-show-private-comments",
  name: "Show private comments",
  callback: () => {
    void plugin.showPrivateComments();
  },
});
