import type { MarkdownFileInfo, MarkdownView, TFile } from "obsidian";
import { get } from "svelte/store";

import {
  insertCharacterCue,
  insertParenthetical,
  insertSceneHeading,
  insertStanza,
  setNoteForm,
} from "src/model/page-form";
import type { PageForm } from "src/model/page-form";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";

import type { CommandBuilder } from "./types";

function longformFile(view: MarkdownView | MarkdownFileInfo): TFile | null {
  const file = view.file;
  if (!file || !draftForPath(file.path, get(drafts))) {
    return null;
  }
  return file;
}

function setForm(form: PageForm, name: string): CommandBuilder {
  return (plugin) => ({
    id: `longform-form-${form}`,
    name,
    editorCheckCallback(checking, _editor, view) {
      const file = longformFile(view);
      if (!file) {
        return false;
      }
      if (checking) {
        return true;
      }
      void setNoteForm(plugin.app, file, form);
    },
  });
}

export const setProseForm = setForm("prose", "Set page form to prose");
export const setVerseForm = setForm("verse", "Set page form to verse");
export const setColumnForm = setForm("column", "Set page form to column");
export const setScriptForm = setForm("script", "Set page form to script");

export const newStanza: CommandBuilder = () => ({
  id: "longform-new-stanza",
  name: "New stanza",
  editorCheckCallback(checking, editor, view) {
    if (!longformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertStanza(editor);
  },
});

export const sceneHeading: CommandBuilder = () => ({
  id: "longform-scene-heading",
  name: "Insert scene heading",
  editorCheckCallback(checking, editor, view) {
    if (!longformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertSceneHeading(editor);
  },
});

export const characterCue: CommandBuilder = () => ({
  id: "longform-character-cue",
  name: "Insert character cue",
  editorCheckCallback(checking, editor, view) {
    if (!longformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertCharacterCue(editor);
  },
});

export const parenthetical: CommandBuilder = () => ({
  id: "longform-parenthetical",
  name: "Insert parenthetical",
  editorCheckCallback(checking, editor, view) {
    if (!longformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    insertParenthetical(editor);
  },
});
