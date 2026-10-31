import { MarkdownView } from "obsidian";
import type { App } from "obsidian";
import { get } from "svelte/store";

import { createBibleCard } from "src/commands/bible";
import { passageTitle } from "src/model/capture";
import { draftForPath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import type { Draft } from "src/model/types";
import { PassageModal } from "src/view/capture/capture-modals";

import { captureFolder, createCapture } from "./capture-files";
import { startDictation, stopDictation } from "./dictation";
import type { CommandBuilder } from "./types";

export async function captureInboxText(app: App, text: string) {
  const file = await createCapture(
    app,
    { kind: "fragment", project: "", text },
    "Captura"
  );
  await app.workspace.getLeaf(false).openFile(file);
  return file;
}

export const captureToInbox: CommandBuilder = (plugin) => ({
  id: "longform-capture-inbox",
  name: "Capture to inbox",
  callback: () => {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const selected = view?.editor?.getSelection() ?? "";
    if (selected.trim().length > 0) {
      void captureInboxText(plugin.app, selected);
      return;
    }
    new PassageModal(plugin.app, "Inbox", "A phrase, a line, an image", (text) => {
      void captureInboxText(plugin.app, text);
    }).open();
  },
});

export const dictateDraft: CommandBuilder = (plugin) => ({
  id: "longform-dictate-draft",
  name: "Dictate a raw draft",
  callback: () => {
    void startDictation(plugin.app, get(selectedDraft));
  },
});

export const stopDictationCommand: CommandBuilder = () => ({
  id: "longform-stop-dictation",
  name: "Stop dictation",
  callback: () => {
    stopDictation();
  },
});

export const noteFromPassage: CommandBuilder = (plugin) => ({
  id: "longform-note-from-passage",
  name: "Note from passage",
  editorCheckCallback(checking, editor, view) {
    const selected = editor.getSelection().trim();
    const draft = view.file ? draftForPath(view.file.path, get(drafts)) : null;
    if (!draft || selected.length === 0) {
      return false;
    }
    if (checking) {
      return true;
    }
    const path = view.file?.path ?? "";
    new PassageModal(plugin.app, "Note from this passage", "", () => undefined, [
      {
        label: "Revision question",
        run: () => {
          void bornCapture(plugin.app, draft, "question", selected, path);
        },
      },
      {
        label: "Fact to check",
        run: () => {
          void bornCapture(plugin.app, draft, "fact", selected, path);
        },
      },
      {
        label: "Card",
        run: () => {
          void createBibleCard(plugin.app, draft, "thing", passageTitle(selected)).then(
            async (file) => {
              if (!file) {
                return;
              }
              await plugin.app.vault.append(file, `\n${selected}\n`);
              await plugin.app.workspace.getLeaf(false).openFile(file);
            }
          );
        },
      },
    ]).open();
  },
});

async function bornCapture(
  app: App,
  draft: Draft,
  kind: "question" | "fact",
  text: string,
  bornFrom: string
): Promise<void> {
  const file = await createCapture(
    app,
    { kind, project: draft.title, text, bornFrom },
    captureFolder(draft)
  );
  await app.workspace.getLeaf(false).openFile(file);
}
