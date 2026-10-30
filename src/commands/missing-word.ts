import type { Editor, MarkdownFileInfo, MarkdownView } from "obsidian";
import { get } from "svelte/store";

import { missingWordEdit } from "src/model/missing-word";
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

export function insertMissingWordInto(editor: Editor): void {
  const selected = editor.getSelection();
  if (selected.length > 0) {
    editor.replaceSelection("TK");
    return;
  }

  const cursor = editor.getCursor();
  const before = editor.getLine(cursor.line);
  const edited = missingWordEdit(before, cursor.ch);
  if (edited.line !== before) {
    editor.setLine(cursor.line, edited.line);
    editor.setCursor({ line: cursor.line, ch: edited.to });
    return;
  }
  editor.setSelection(
    { line: cursor.line, ch: edited.from },
    { line: cursor.line, ch: edited.to }
  );
}

export const insertMissingWord: CommandBuilder = () => ({
  id: "longform-insert-missing-word",
  name: "Insert missing word",
  icon: "bookmark",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertMissingWordInto(editor);
  },
});
