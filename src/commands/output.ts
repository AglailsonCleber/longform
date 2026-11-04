import {
  MarkdownView,
  Notice,
  TFile,
  TFolder,
  normalizePath,
  type App,
} from "obsidian";
import { get } from "svelte/store";

import { FORM_KEY } from "src/model/architecture";
import { WHEN_KEY } from "src/model/bible";
import { createNote } from "src/model/note-utils";
import {
  AUTHOR_KEY,
  DEDICATION_KEY,
  EPIGRAPH_KEY,
  EPIGRAPH_SOURCE_KEY,
  bodyFormOf,
  bookOpeningMarkdown,
  extensionFor,
  joinScenes,
  markdownFromDocx,
  openingFromFrontmatter,
  printPreviewHtml,
  professionalWorkflows,
  scenesFromMarkdownFiles,
  scenesFromScrivx,
  toDocx,
  toHtml,
  toPdf,
  toPlainText,
} from "src/model/output";
import type {
  ExportFormat,
  SceneForOutput,
  SceneSeparatorKind,
} from "src/model/output";
import { draftForPath, scenePath } from "src/model/scene-navigation";
import { drafts, selectedDraft, workflows } from "src/model/stores";
import type { Draft, MultipleSceneDraft } from "src/model/types";
import { epubFiles, zipStore } from "src/model/literary";
import { deserializeWorkflow } from "src/compile/serialization";
import { AskTextModal } from "src/view/revision/revision-modals";
import {
  OpeningModal,
  SeparatorModal,
} from "src/view/output/output-modals";

import type { CommandBuilder } from "./types";

async function scenesForDraft(app: App, draft: Draft): Promise<SceneForOutput[]> {
  const scenes: SceneForOutput[] = [];
  if (draft.format === "scenes") {
    for (const scene of draft.scenes) {
      const path = scenePath(scene.title, draft, app.vault);
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        continue;
      }
      const text = await app.vault.read(file);
      const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
      scenes.push({
        title: scene.title,
        text,
        form: bodyFormOf(frontmatter?.[FORM_KEY]),
        when: String(frontmatter?.[WHEN_KEY] ?? "").trim(),
        indent: scene.indent,
      });
    }
  } else {
    const file = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (file instanceof TFile) {
      const text = await app.vault.read(file);
      const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
      scenes.push({
        title: draft.title,
        text,
        form: bodyFormOf(frontmatter?.[FORM_KEY]),
        when: String(frontmatter?.[WHEN_KEY] ?? "").trim(),
        indent: 0,
      });
    }
  }
  return scenes;
}

async function manuscriptText(
  app: App,
  draft: Draft,
  separator: SceneSeparatorKind
): Promise<string> {
  const scenes = await scenesForDraft(app, draft);
  const index = app.vault.getAbstractFileByPath(draft.vaultPath);
  const frontmatter =
    index instanceof TFile
      ? app.metadataCache.getFileCache(index)?.frontmatter
      : undefined;
  const opening = openingFromFrontmatter(draft.title, frontmatter);
  const front = bookOpeningMarkdown(
    opening,
    scenes.map((scene) => scene.title)
  );
  return `${front}${joinScenes(scenes, separator)}`;
}

function projectFolder(draft: Draft): string {
  const parts = draft.vaultPath.split("/");
  parts.pop();
  return parts.join("/");
}

async function writeBytes(app: App, path: string, bytes: Uint8Array): Promise<void> {
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder.length > 0) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      // exists
    }
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await app.vault.adapter.writeBinary(path, copy.buffer);
}

export async function exportProjectFormat(
  app: App,
  format: ExportFormat,
  separator: SceneSeparatorKind = "title"
): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const contents = await manuscriptText(app, draft, separator);
  const folder = normalizePath(`${projectFolder(draft)}/Output`);
  const path = normalizePath(
    `${folder}/${draft.title}.${extensionFor(format)}`
  );
  if (format === "markdown") {
    await app.vault.adapter.write(path, contents);
  } else if (format === "text") {
    await app.vault.adapter.write(path, toPlainText(contents));
  } else if (format === "html") {
    await app.vault.adapter.write(
      path,
      toHtml(contents, { title: draft.title, doubleSpace: false })
    );
  } else if (format === "docx") {
    await writeBytes(app, path, toDocx(contents));
  } else if (format === "pdf") {
    await writeBytes(app, path, toPdf(contents, draft.title));
  } else if (format === "epub") {
    const files = epubFiles(draft.title, draft.title, [
      { title: draft.title, text: contents },
    ]);
    await writeBytes(app, path, zipStore(files));
  }
  new Notice(`Exported ${path}`);
  if (format === "markdown" || format === "html" || format === "text") {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      void app.workspace.getLeaf(true).openFile(file);
    }
  }
}

export function editOpening(app: App): void {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const index = app.vault.getAbstractFileByPath(draft.vaultPath);
  if (!(index instanceof TFile)) {
    return;
  }
  const current = openingFromFrontmatter(
    draft.title,
    app.metadataCache.getFileCache(index)?.frontmatter
  );
  new OpeningModal(app, current, (next) => {
    void app.fileManager.processFrontMatter(index, (frontmatter) => {
      frontmatter[AUTHOR_KEY] = next.author;
      frontmatter[DEDICATION_KEY] = next.dedication;
      frontmatter[EPIGRAPH_KEY] = next.epigraph;
      frontmatter[EPIGRAPH_SOURCE_KEY] = next.epigraphSource;
    });
    new Notice("Opening pages saved on the project index.");
  }).open();
}

export async function showPrintPreview(app: App): Promise<void> {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const contents = await manuscriptText(app, draft, "title");
  const html = printPreviewHtml(draft.title, contents);
  const path = normalizePath(`${projectFolder(draft)}/Output/${draft.title}-print.html`);
  try {
    await app.vault.createFolder(normalizePath(`${projectFolder(draft)}/Output`));
  } catch {
    // exists
  }
  await app.vault.adapter.write(path, html);
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) {
    await app.workspace.getLeaf(true).openFile(file);
  }
  new Notice("Print preview opened. Use the system print dialog for paper or PDF.");
}

export function ensureProfessionalWorkflows(): void {
  const presets = professionalWorkflows();
  workflows.update((current) => {
    const next = { ...current };
    for (const [name, serialized] of Object.entries(presets)) {
      if (!next[name]) {
        next[name] = deserializeWorkflow(serialized);
      }
    }
    return next;
  });
  new Notice("Publisher Manuscript and Reading Book are ready in Compile.");
}

function uniqueTitle(draft: MultipleSceneDraft, base: string): string {
  let title = base.replace(/[<>:"/\\|?*]/g, " ").trim() || "Imported";
  const have = new Set(draft.scenes.map((scene) => scene.title));
  if (!have.has(title)) {
    return title;
  }
  let index = 2;
  while (have.has(`${title} ${index}`)) {
    index += 1;
  }
  return `${title} ${index}`;
}

async function appendScenes(
  app: App,
  draft: MultipleSceneDraft,
  imported: { title: string; text: string }[]
): Promise<void> {
  for (const scene of imported) {
    const title = uniqueTitle(draft, scene.title);
    const path = scenePath(title, draft, app.vault);
    const created = await createNote(app, path, scene.text);
    if (!created) {
      continue;
    }
    draft = {
      ...draft,
      scenes: [...draft.scenes, { title, indent: 0 }],
      unknownFiles: draft.unknownFiles.filter((entry) => entry !== title),
    };
    drafts.update((all) =>
      all.map((item) => (item.vaultPath === draft.vaultPath ? draft : item))
    );
  }
  new Notice(`Imported ${imported.length} scene${imported.length === 1 ? "" : "s"}.`);
}

export function importMarkdownFolder(app: App): void {
  const draft = get(selectedDraft);
  if (!draft || draft.format !== "scenes") {
    new Notice("Open a multi-scene draft to import into.");
    return;
  }
  new AskTextModal(app, "Folder of Markdown files", "Drafts/from-elsewhere", (folder) => {
    void (async () => {
      const abs = app.vault.getAbstractFileByPath(normalizePath(folder));
      if (!(abs instanceof TFolder)) {
        new Notice("That folder was not found.");
        return;
      }
      const files: { name: string; text: string }[] = [];
      for (const child of abs.children) {
        if (child instanceof TFile && child.extension === "md") {
          files.push({ name: child.basename, text: await app.vault.read(child) });
        }
      }
      await appendScenes(app, draft, scenesFromMarkdownFiles(files));
    })();
  }).open();
}

export function importDocxFile(app: App): void {
  const draft = get(selectedDraft);
  if (!draft || draft.format !== "scenes") {
    new Notice("Open a multi-scene draft to import into.");
    return;
  }
  new AskTextModal(app, "DOCX path in the vault", "Inbox/story.docx", (path) => {
    void (async () => {
      const file = app.vault.getAbstractFileByPath(normalizePath(path));
      if (!(file instanceof TFile)) {
        new Notice("That DOCX was not found.");
        return;
      }
      const bytes = new Uint8Array(await app.vault.readBinary(file));
      const text = markdownFromDocx(bytes);
      if (text.trim().length === 0) {
        new Notice("No paragraphs were found in that DOCX.");
        return;
      }
      await appendScenes(app, draft, [
        { title: file.basename, text },
      ]);
    })();
  }).open();
}

export function importScrivener(app: App): void {
  const draft = get(selectedDraft);
  if (!draft || draft.format !== "scenes") {
    new Notice("Open a multi-scene draft to import into.");
    return;
  }
  new AskTextModal(
    app,
    "Scrivener .scrivx path",
    "Inbox/Novel.scriv/Novel.scrivx",
    (path) => {
      void (async () => {
        const file = app.vault.getAbstractFileByPath(normalizePath(path));
        if (!(file instanceof TFile)) {
          new Notice("That Scrivener project file was not found.");
          return;
        }
        const xml = await app.vault.read(file);
        const texts: Record<string, string> = {};
        const folder = file.parent;
        if (folder) {
          const files = app.vault
            .getMarkdownFiles()
            .filter((entry) => entry.path.startsWith(folder.path + "/"));
          for (const entry of files) {
            const id = entry.basename;
            texts[id] = await app.vault.read(entry);
          }
          // Scrivener often stores RTF; also try Files/UUID/content.rtf as plain-ish
          for (const child of folder.children) {
            if (!(child instanceof TFolder)) {
              continue;
            }
            if (child.name !== "Files" && child.name !== "Data") {
              continue;
            }
            for (const nested of child.children) {
              if (nested instanceof TFolder) {
                for (const leaf of nested.children) {
                  if (leaf instanceof TFile && (leaf.extension === "txt" || leaf.extension === "md")) {
                    texts[nested.name] = await app.vault.read(leaf);
                  }
                }
              }
            }
          }
        }
        const imported = scenesFromScrivx(xml, texts);
        if (imported.length === 0) {
          new Notice("No text binder items were found.");
          return;
        }
        await appendScenes(app, draft, imported);
      })();
    }
  ).open();
}

export const editBookOpening: CommandBuilder = (plugin) => ({
  id: "longform-edit-opening",
  name: "Edit book opening",
  callback: () => {
    editOpening(plugin.app);
  },
});

export const printAsItWillPrint: CommandBuilder = (plugin) => ({
  id: "longform-print-preview",
  name: "Page as it will print",
  callback: () => {
    void showPrintPreview(plugin.app);
  },
});

export const exportMarkdownCommand: CommandBuilder = (plugin) => ({
  id: "longform-export-markdown",
  name: "Export as Markdown",
  callback: () => {
    void exportProjectFormat(plugin.app, "markdown");
  },
});

export const exportAllFormats: CommandBuilder = (plugin) => ({
  id: "longform-export-choose-format",
  name: "Export in a format",
  callback: () => {
    new AskTextModal(
      plugin.app,
      "Format",
      "markdown | text | html | epub | docx | pdf",
      (value) => {
        const format = value.trim().toLocaleLowerCase("pt-BR");
        const allowed: ExportFormat[] = [
          "markdown",
          "text",
          "html",
          "epub",
          "docx",
          "pdf",
        ];
        if (allowed.indexOf(format as ExportFormat) < 0) {
          new Notice("Choose markdown, text, html, epub, docx, or pdf.");
          return;
        }
        void exportProjectFormat(plugin.app, format as ExportFormat);
      }
    ).open();
  },
});

export const installProfessionalOutputs: CommandBuilder = (plugin) => ({
  id: "longform-install-professional-workflows",
  name: "Install publisher and reading workflows",
  callback: () => {
    ensureProfessionalWorkflows();
  },
});

export const importMarkdownCommand: CommandBuilder = (plugin) => ({
  id: "longform-import-markdown",
  name: "Import Markdown folder",
  callback: () => {
    importMarkdownFolder(plugin.app);
  },
});

export const importDocxCommand: CommandBuilder = (plugin) => ({
  id: "longform-import-docx",
  name: "Import DOCX",
  callback: () => {
    importDocxFile(plugin.app);
  },
});

export const importScrivenerCommand: CommandBuilder = (plugin) => ({
  id: "longform-import-scrivener",
  name: "Import Scrivener project",
  callback: () => {
    importScrivener(plugin.app);
  },
});

export function chooseSeparator(app: App, onPick: (kind: SceneSeparatorKind) => void): void {
  new SeparatorModal(app, onPick).open();
}

export function currentDraftPath(app: App): string | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file) {
    return get(selectedDraft)?.vaultPath ?? null;
  }
  return draftForPath(view.file.path, get(drafts))?.vaultPath ?? null;
}

// Avoid unused dynamic import lint by referencing bookOpeningMarkdown statically too
export { manuscriptText };
