import { MarkdownView, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  FORM_KIND_KEY,
  FOLD_STANZA_KEY,
  SOUND_LAYERS_KEY,
  STRESS_KEY,
  applyStressCorrection,
  formScaffold,
  parseFixedForm,
  rhymeDictionary,
  scanPoem,
  soundLayersFromFrontmatter,
  stressMapFromFrontmatter,
  type FixedForm,
  type SoundLayers,
} from "src/model/verse";
import { craftTick, soundLayers, verseMode } from "src/model/craft-store";
import { FORM_KEY } from "src/model/architecture";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";
import { explorerTabs } from "src/model/project-kind";
import { AskTextModal } from "src/view/revision/revision-modals";

import type { CommandBuilder } from "./types";

function activeLongformFile(app: App): TFile | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const draft = view.file ? draftForPath(view.file.path, get(drafts)) : null;
  if (!view?.file || !draft || explorerTabs(draft).indexOf("Verse") < 0) {
    return null;
  }
  return view.file;
}

function activeText(app: App): string {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    return "";
  }
  const selected = view.editor.getSelection();
  return selected.length > 0 ? selected : view.editor.getValue();
}

export async function correctStress(app: App): Promise<void> {
  const file = activeLongformFile(app);
  if (!file) {
    new Notice("Open a Longform verse note first.");
    return;
  }
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const selected = view?.editor.getSelection().trim() ?? "";
  new AskTextModal(
    app,
    "Stress correction",
    selected ? `${selected} with * on the stress` : "sa*biá",
    (value) => {
      const parts = value.trim().split(/\s+/);
      const word = parts[0]?.replace(/[\*'′]/g, "") ?? "";
      const marked = value.trim();
      if (!word) {
        return;
      }
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        const map = applyStressCorrection(
          stressMapFromFrontmatter(frontmatter),
          word,
          marked
        );
        frontmatter[STRESS_KEY] = map;
      });
      craftTick.update((tick) => tick + 1);
      new Notice(`Stress kept on “${word}”.`);
    }
  ).open();
}

export async function insertFormScaffold(app: App, kind?: FixedForm): Promise<void> {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const file = activeLongformFile(app);
  if (!view || !file) {
    new Notice("Open a Longform note first.");
    return;
  }
  const run = (form: FixedForm) => {
    void app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[FORM_KIND_KEY] = form;
      frontmatter[FORM_KEY] = "verse";
    });
    const scaffold = formScaffold(form);
    if (view.editor.getValue().trim().length === 0) {
      view.editor.setValue(scaffold);
    } else {
      view.editor.replaceSelection(scaffold);
    }
    craftTick.update((tick) => tick + 1);
    new Notice(`Scaffold: ${form}. Empty lines wait for the verses.`);
  };
  if (kind) {
    run(kind);
    return;
  }
  new AskTextModal(
    app,
    "Fixed form",
    "sonnet | haiku | villanelle | sestina | redondilha | decima | quatrain",
    (value) => {
      const form = parseFixedForm(value);
      if (!form) {
        new Notice("Unknown form.");
        return;
      }
      run(form);
    }
  ).open();
}

export function lookupRhymes(app: App): void {
  const text = activeText(app);
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const seed = view?.editor.getSelection().trim() || "";
  new AskTextModal(app, "Rhyme seed word", seed || "mar", (value) => {
    const word = value.trim().split(/\s+/)[0] ?? "";
    if (!word) {
      return;
    }
    new AskTextModal(app, "Syllable filter (0 = any)", "0", (filterValue) => {
      const filter = Number(filterValue) || 0;
      const file = activeLongformFile(app);
      const stress = file
        ? stressMapFromFrontmatter(
            app.metadataCache.getFileCache(file)?.frontmatter
          )
        : {};
      const entries = rhymeDictionary(text, word, filter, stress);
      if (entries.length === 0) {
        new Notice("No rhymes in this page yet.");
        return;
      }
      const lines = entries
        .slice(0, 12)
        .map((entry) => `${entry.word} (${entry.kind}, ${entry.syllables})`)
        .join(" · ");
      new Notice(lines);
      craftTick.update((tick) => tick + 1);
    }).open();
  }).open();
}

export function toggleSoundLayer(
  layer: keyof SoundLayers,
  app: App
): void {
  soundLayers.update((current) => {
    const next = { ...current, [layer]: !current[layer] };
    const file = activeLongformFile(app);
    if (file) {
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[SOUND_LAYERS_KEY] = next;
      });
    }
    return next;
  });
  craftTick.update((tick) => tick + 1);
}

export function setFoldStanza(app: App, index: number): void {
  const file = activeLongformFile(app);
  if (!file) {
    return;
  }
  void app.fileManager.processFrontMatter(file, (frontmatter) => {
    if (index <= 0) {
      delete frontmatter[FOLD_STANZA_KEY];
    } else {
      frontmatter[FOLD_STANZA_KEY] = index;
    }
  });
  craftTick.update((tick) => tick + 1);
  new Notice(
    index > 0
      ? `Working stanza ${index}. The rest is folded.`
      : "All stanzas open."
  );
}

export function showLineScansion(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const file = activeLongformFile(app);
  if (!view || !file) {
    return;
  }
  const line = view.editor.getLine(view.editor.getCursor().line);
  const stress = stressMapFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  );
  const scan = scanPoem(line, stress)[0];
  if (!scan) {
    return;
  }
  const mode = get(verseMode);
  const count = mode === "phonetic" ? scan.phonetic : scan.classical;
  new Notice(
    `${mode}: ${count} syllable${count === 1 ? "" : "s"}${
      scan.rhymeLetter ? ` · rhyme ${scan.rhymeLetter}` : ""
    }`
  );
}

export function syncSoundLayersFromFile(app: App): void {
  const file = activeLongformFile(app);
  if (!file) {
    return;
  }
  soundLayers.set(
    soundLayersFromFrontmatter(
      app.metadataCache.getFileCache(file)?.frontmatter
    )
  );
}

export const correctStressCommand: CommandBuilder = (plugin) => ({
  id: "longform-correct-stress",
  name: "Correct verse stress",
  callback: () => {
    void correctStress(plugin.app);
  },
});

export const insertFormScaffoldCommand: CommandBuilder = (plugin) => ({
  id: "longform-form-scaffold",
  name: "Insert fixed-form scaffold",
  callback: () => {
    void insertFormScaffold(plugin.app);
  },
});

export const lookupRhymesCommand: CommandBuilder = (plugin) => ({
  id: "longform-lookup-rhymes",
  name: "Look up rhymes by sound",
  callback: () => {
    lookupRhymes(plugin.app);
  },
});

export const showLineScansionCommand: CommandBuilder = (plugin) => ({
  id: "longform-line-scansion",
  name: "Count syllables on this line",
  callback: () => {
    showLineScansion(plugin.app);
  },
});
