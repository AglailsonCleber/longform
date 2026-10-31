import { Notice, TFile, normalizePath, type App } from "obsidian";
import { get } from "svelte/store";

import { ROLE_KEY } from "src/model/architecture";
import { noteBody } from "src/model/plot";
import {
  ENDING_KEY,
  ENDINGS_KEY,
  assignPlot,
  assignScaffold,
  bookScenes,
  endingGroups,
  plotSceneFromFrontmatter,
  type PlotScene,
  type ScaffoldKind,
} from "src/model/plot";
import { createNote } from "src/model/note-utils";
import { scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft } from "src/model/stores";
import type { MultipleSceneDraft } from "src/model/types";

import type { CommandBuilder } from "./types";

export async function savePlot(app: App, scene: PlotScene): Promise<void> {
  const file = app.vault.getAbstractFileByPath(scene.path);
  if (!(file instanceof TFile)) {
    return;
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    assignPlot(frontmatter, scene);
    if (scene.ending === "alternate") {
      frontmatter[ROLE_KEY] = "variant";
    }
  });
}

export async function saveScaffold(app: App, path: string, kind: ScaffoldKind): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    assignScaffold(frontmatter, kind);
  });
}

async function pushScene(
  app: App,
  scenes: PlotScene[],
  path: string,
  title: string
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  const text = await app.vault.cachedRead(file);
  scenes.push(
    plotSceneFromFrontmatter(
      path,
      title,
      app.metadataCache.getFileCache(file)?.frontmatter,
      text
    )
  );
}

export async function loadPlotScenes(app: App): Promise<PlotScene[]> {
  const draft = get(selectedDraft);
  const scenes: PlotScene[] = [];
  if (!draft) {
    return scenes;
  }
  if (draft.format === "single") {
    await pushScene(app, scenes, draft.vaultPath, draft.title);
    const extra = app.metadataCache.getCache(draft.vaultPath)?.frontmatter?.[ENDINGS_KEY];
    if (extra instanceof Array) {
      for (const item of extra) {
        if (typeof item === "string") {
          const name = item.split("/").pop()?.replace(/\.md$/, "") ?? item;
          await pushScene(app, scenes, item, name);
        }
      }
    }
    return scenes;
  }
  for (const scene of draft.scenes) {
    const path = scenePath(scene.title, draft, app.vault);
    if (path) {
      await pushScene(app, scenes, path, scene.title);
    }
  }
  return scenes;
}

export async function createAlternateEnding(app: App): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const scenes = await loadPlotScenes(app);
  const groups = endingGroups(scenes);
  const trunk = groups.trunk[0] ?? bookScenes(scenes)[bookScenes(scenes).length - 1];
  let body = "Another ending. The trunk stays in the manuscript.\n";
  if (trunk) {
    const file = app.vault.getAbstractFileByPath(trunk.path);
    if (file instanceof TFile) {
      body += `\n${noteBody(await app.vault.read(file)).trim()}\n`;
    }
  }
  if (draft.format === "single") {
    const parent = draft.vaultPath.includes("/")
      ? draft.vaultPath.split("/").slice(0, -1).join("/")
      : "";
    const path = normalizePath(
      [parent, "Alternate ending.md"].filter((part) => part.length > 0).join("/")
    );
    let file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      file = await createNote(app, path, body);
    }
    if (!(file instanceof TFile)) {
      return;
    }
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[ROLE_KEY] = "variant";
      frontmatter[ENDING_KEY] = "alternate";
    });
    const index = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (index instanceof TFile) {
      await app.fileManager.processFrontMatter(index, (frontmatter) => {
        const current = frontmatter[ENDINGS_KEY];
        const paths: string[] = [];
        if (current instanceof Array) {
          for (const item of current) {
            if (typeof item === "string" && paths.indexOf(item) < 0) {
              paths.push(item);
            }
          }
        }
        if (paths.indexOf(file.path) < 0) {
          paths.push(file.path);
        }
        frontmatter[ENDINGS_KEY] = paths;
      });
    }
    await app.workspace.getLeaf(false).openFile(file);
    return;
  }
  const multi = draft as MultipleSceneDraft;
  let name = "Alternate ending";
  let index = 2;
  const taken = new Set(multi.scenes.map((scene) => scene.title));
  while (taken.has(name)) {
    name = `Alternate ending ${index}`;
    index += 1;
  }
  const path = scenePath(name, multi, app.vault);
  if (!path) {
    return;
  }
  const file = await createNote(app, path, body);
  if (!file) {
    return;
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter[ROLE_KEY] = "variant";
    frontmatter[ENDING_KEY] = "alternate";
  });
  drafts.update((all) =>
    all.map((item) => {
      if (item.vaultPath !== multi.vaultPath || item.format !== "scenes") {
        return item;
      }
      const already = item.scenes.some((scene) => scene.title === name);
      return {
        ...item,
        scenes: already ? item.scenes : [...item.scenes, { title: name, indent: 0 }],
        unknownFiles: item.unknownFiles.filter((entry) => entry !== name),
      };
    })
  );
  await app.workspace.getLeaf(false).openFile(file);
}

export const newAlternateEnding: CommandBuilder = (plugin) => ({
  id: "longform-alternate-ending",
  name: "New alternate ending",
  callback: () => {
    void createAlternateEnding(plugin.app);
  },
});
