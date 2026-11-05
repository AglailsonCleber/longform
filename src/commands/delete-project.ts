import { Notice, TFile, TFolder, type App } from "obsidian";
import { get } from "svelte/store";

import {
  noteOwnedByProject,
  parentOfVaultPath,
  pathCoveredByFolder,
  projectDeletionPlan,
} from "src/model/project-deletion";
import { pluginSettings, projects, selectedDraft } from "src/model/stores";
import type { Draft } from "src/model/types";
import type LongformPlugin from "src/main";
import ConfirmActionModal from "src/view/ConfirmActionModal";
import { literaryLedger } from "src/view/literary-ledger";
import { workshopLedger } from "src/view/workshop-ledger";

import type { CommandBuilder } from "./types";

function belongsToRemoved(path: string, files: string[], folders: string[]): boolean {
  if (files.indexOf(path) >= 0) {
    return true;
  }
  for (const folder of folders) {
    if (pathCoveredByFolder(path, folder)) {
      return true;
    }
  }
  return false;
}

async function trashPath(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    return;
  }
  await app.vault.trash(file, true);
}

async function removeFrozen(app: App, relative: string): Promise<void> {
  if (!relative) {
    return;
  }
  const full = `${app.vault.configDir}/${relative}`;
  try {
    if (await app.vault.adapter.exists(full)) {
      await app.vault.adapter.remove(full);
    }
  } catch {
    // The copy may already be gone.
  }
}

export async function deleteProjectFiles(
  plugin: LongformPlugin,
  projectDrafts: Draft[]
): Promise<void> {
  const app = plugin.app;
  const title = projectDrafts[0]?.title ?? "";
  if (!title || projectDrafts.length === 0) {
    return;
  }
  const parents: Record<string, string> = {};
  for (const draft of projectDrafts) {
    const file = app.vault.getAbstractFileByPath(draft.vaultPath);
    parents[draft.vaultPath] =
      file instanceof TFile && file.parent
        ? file.parent.path
        : parentOfVaultPath(draft.vaultPath);
  }
  const plan = projectDeletionPlan(projectDrafts, parents);
  const indexes = new Set(projectDrafts.map((draft) => draft.vaultPath));

  for (const path of plan.files) {
    if (indexes.has(path)) {
      await trashPath(app, path);
    }
  }

  for (const file of app.vault.getMarkdownFiles()) {
    if (belongsToRemoved(file.path, plan.files, plan.folders)) {
      continue;
    }
    if (
      noteOwnedByProject(
        app.metadataCache.getFileCache(file)?.frontmatter,
        title
      )
    ) {
      await trashPath(app, file.path);
    }
  }

  for (const path of plan.files) {
    if (!indexes.has(path)) {
      await trashPath(app, path);
    }
  }

  for (const folder of plan.folders) {
    await trashPath(app, folder);
  }

  const parentPaths: string[] = [];
  for (const draft of projectDrafts) {
    const parent = parents[draft.vaultPath];
    if (parent && parentPaths.indexOf(parent) < 0) {
      parentPaths.push(parent);
    }
  }
  for (const parent of parentPaths) {
    const folder = app.vault.getAbstractFileByPath(parent);
    if (folder instanceof TFolder && folder.children.length === 0) {
      await app.vault.trash(folder, true);
    }
  }

  const removed = (path: string) =>
    belongsToRemoved(path, plan.files, plan.folders) ||
    parentPaths.some((parent) => pathCoveredByFolder(path, parent));
  plugin.revisionLedger?.dropWhere(removed);
  plugin.pageRecovery?.forgetWhere(removed);

  const life = literaryLedger();
  if (life) {
    for (const frozen of life.dropProject(title)) {
      await removeFrozen(app, frozen);
    }
    life.flush();
  }
  const workshop = workshopLedger();
  if (workshop) {
    for (const frozen of workshop.dropProject(title)) {
      await removeFrozen(app, frozen);
    }
    workshop.flush();
  }

  pluginSettings.update((settings) => ({
    ...settings,
    sessions: settings.sessions.map((session) => {
      const next = { ...session.drafts };
      for (const path of indexes) {
        delete next[path];
      }
      return { ...session, drafts: next };
    }),
  }));

  new Notice(
    `Deleted “${title}”. Its notes and project folders went to the system trash.`
  );
}

export function confirmDeleteProject(plugin: LongformPlugin, draft: Draft): void {
  const group = get(projects)[draft.title] ?? [draft];
  const count = group.length;
  new ConfirmActionModal(
    plugin.app,
    "Delete project",
    `Delete “${draft.title}” and clean its files. This removes ${count} draft${
      count === 1 ? "" : "s"
    }, scene notes, and the Pesquisa, Bíblia, Reading, Output, and Workshop folders beside each draft. Research and bible notes kept for this project go too. Anything else in the folder stays. The notes move to the system trash.`,
    "Delete project",
    () => {
      void deleteProjectFiles(plugin, group);
    }
  ).open();
}

export const deleteProjectCommand: CommandBuilder = (plugin) => ({
  id: "longform-delete-project",
  name: "Delete this project",
  callback: () => {
    const draft = get(selectedDraft);
    if (!draft) {
      new Notice("Open a Longform project first.");
      return;
    }
    confirmDeleteProject(plugin, draft);
  },
});
