import type { Editor, MarkdownFileInfo, MarkdownView } from "obsidian";
import { get } from "svelte/store";

import {
  applySpan,
  dialogueDashEdit,
  quotedText,
} from "src/model/portuguese";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";

import type { CommandBuilder } from "./types";

function isLongformFile(view: MarkdownView | MarkdownFileInfo): boolean {
  const path = view.file?.path;
  if (!path) {
    return false;
  }
  return draftForPath(path, get(drafts)) !== null;
}

export function insertDialogueDashInto(editor: Editor): void {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const edit = dialogueDashEdit(line, cursor.ch);
  editor.setLine(cursor.line, applySpan(line, edit));
  editor.setCursor({ line: cursor.line, ch: edit.cursor });
}

export function insertQuotesInto(editor: Editor): void {
  const selected = editor.getSelection();
  const result = quotedText(selected);
  editor.replaceSelection(result.text);
  if (result.cursorOffset >= result.text.length) {
    return;
  }
  const cursor = editor.getCursor();
  editor.setCursor({
    line: cursor.line,
    ch: Math.max(0, cursor.ch - (result.text.length - result.cursorOffset)),
  });
}

export const insertDialogueDash: CommandBuilder = () => ({
  id: "longform-insert-dialogue-dash",
  name: "Insert dialogue dash",
  icon: "minus",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertDialogueDashInto(editor);
  },
});

export const insertQuotes: CommandBuilder = () => ({
  id: "longform-insert-quotes",
  name: "Insert quotes",
  icon: "quote",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertQuotesInto(editor);
  },
});
