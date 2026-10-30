import { MarkdownView, Notice, TFile, type App } from "obsidian";

import { matchingEditorState } from "src/model/page-beside";

/** Opens a note to the right, in the same editing or reading mode as the page already open. */
export async function openNoteBeside(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    new Notice("That note is not in the vault.");
    return;
  }

  const active = app.workspace.getActiveViewOfType(MarkdownView);
  const state = matchingEditorState(active?.getState());
  const leaf = app.workspace.getLeaf("split", "vertical");
  await leaf.openFile(file, state ? { state } : undefined);

  const view = leaf.view;
  if (!(view instanceof MarkdownView) || !state) {
    return;
  }
  const opened = matchingEditorState(view.getState());
  if (opened?.mode === state.mode && opened.source === state.source) {
    return;
  }
  await view.setState({ ...view.getState(), ...state }, { history: false });
}
