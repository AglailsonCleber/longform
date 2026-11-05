import { MarkdownView, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  EFFECT_KEY,
  MOTIFS_KEY,
  MOTIF_KEY,
  assignLengthKind,
  dilutingPassages,
  edgeParagraphs,
  parseLengthKind,
  pinEdges,
  setCentralEffect,
  setKnowledge,
  setPieceMotifs,
  setProjectMotifs,
  sittingReadMinutes,
  storyFromFrontmatter,
  type LengthKind,
} from "src/model/story";
import { countWordsSimple } from "src/model/habit";
import { craftTick } from "src/model/craft-store";
import { draftForPath } from "src/model/scene-navigation";
import { drafts, pluginSettings, selectedDraft } from "src/model/stores";
import { explorerTabs } from "src/model/project-kind";
import { AskTextModal } from "src/view/revision/revision-modals";
import { createAlternateEnding } from "src/commands/plot";

import type { CommandBuilder } from "./types";

function activeFile(app: App): TFile | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const draft = view.file ? draftForPath(view.file.path, get(drafts)) : null;
  if (!view?.file || !draft || explorerTabs(draft).indexOf("Story") < 0) {
    return null;
  }
  return view.file;
}

export function setStoryLength(app: App, kind?: LengthKind): void {
  const file = activeFile(app);
  if (!file) {
    new Notice("Open a Longform story first.");
    return;
  }
  const run = (value: LengthKind) => {
    void app.fileManager.processFrontMatter(file, (frontmatter) => {
      assignLengthKind(frontmatter, value);
    });
    craftTick.update((tick) => tick + 1);
    new Notice(`Length for this piece: ${value}. Not a novel goal.`);
  };
  if (kind) {
    run(kind);
    return;
  }
  new AskTextModal(
    app,
    "Length kind",
    "micro | flash | story | novelette",
    (value) => {
      const parsed = parseLengthKind(value);
      if (!parsed) {
        new Notice("Unknown length.");
        return;
      }
      run(parsed);
    }
  ).open();
}

export function pinOpeningAndClose(app: App): void {
  const file = activeFile(app);
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!file || !view) {
    return;
  }
  const edges = edgeParagraphs(view.editor.getValue());
  void app.fileManager.processFrontMatter(file, (frontmatter) => {
    pinEdges(frontmatter, edges.open, edges.close);
  });
  craftTick.update((tick) => tick + 1);
  new Notice("Opening and closing paragraphs pinned.");
}

export function editKnowledge(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const sheet = storyFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  );
  new AskTextModal(
    app,
    "What the reader already knows (comma-separated)",
    sheet.revealed.join(", ") || "the letter exists",
    (revealedValue) => {
      new AskTextModal(
        app,
        "What is still secret (comma-separated)",
        sheet.secret.join(", ") || "who wrote it",
        (secretValue) => {
          const revealed = revealedValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          const secret = secretValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          void app.fileManager.processFrontMatter(file, (frontmatter) => {
            setKnowledge(frontmatter, revealed, secret);
          });
          craftTick.update((tick) => tick + 1);
          new Notice("Reader knowledge updated.");
        }
      ).open();
    }
  ).open();
}

export function editCentralEffect(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const current = textOf(
    app.metadataCache.getFileCache(file)?.frontmatter?.[EFFECT_KEY]
  );
  new AskTextModal(
    app,
    "Central effect — one sentence",
    current || "The knife decides who stays.",
    (value) => {
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        setCentralEffect(frontmatter, value);
      });
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      const weak = view ? dilutingPassages(view.editor.getValue(), value) : [];
      craftTick.update((tick) => tick + 1);
      new Notice(
        weak.length > 0
          ? `Effect kept. ${weak.length} passage${weak.length === 1 ? "" : "s"} may dilute it.`
          : "Effect kept."
      );
    }
  ).open();
}

export function hangAlternateEnding(app: App): void {
  void createAlternateEnding(app);
}

export function editMotifs(app: App, projectLevel: boolean): void {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const target = projectLevel
    ? app.vault.getAbstractFileByPath(draft.vaultPath)
    : activeFile(app);
  if (!(target instanceof TFile)) {
    return;
  }
  const key = projectLevel ? MOTIFS_KEY : MOTIF_KEY;
  const current = stringsOf(
    app.metadataCache.getFileCache(target)?.frontmatter?.[key]
  );
  new AskTextModal(
    app,
    projectLevel ? "Cycle motifs for the collection" : "Motifs on this piece",
    current.join(", ") || "blue key, the river",
    (value) => {
      const motifs = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      void app.fileManager.processFrontMatter(target, (frontmatter) => {
        if (projectLevel) {
          setProjectMotifs(frontmatter, motifs);
        } else {
          setPieceMotifs(frontmatter, motifs);
        }
      });
      craftTick.update((tick) => tick + 1);
      new Notice("Motifs updated.");
    }
  ).open();
}

export function sittingTimeNotice(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    return;
  }
  const words = countWordsSimple(view.editor.getValue());
  const wpm = get(pluginSettings).readingWordsPerMinute || 200;
  const minutes = sittingReadMinutes(words, wpm);
  new Notice(`${words} words · about ${minutes} min to read in one sitting.`);
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (value instanceof Array) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export const setStoryLengthCommand: CommandBuilder = (plugin) => ({
  id: "longform-story-length",
  name: "Set short-story length",
  callback: () => {
    setStoryLength(plugin.app);
  },
});

export const pinStoryEdgesCommand: CommandBuilder = (plugin) => ({
  id: "longform-pin-story-edges",
  name: "Pin opening and closing paragraphs",
  callback: () => {
    pinOpeningAndClose(plugin.app);
  },
});

export const editStoryKnowledgeCommand: CommandBuilder = (plugin) => ({
  id: "longform-story-knowledge",
  name: "Mark what the reader knows",
  callback: () => {
    editKnowledge(plugin.app);
  },
});

export const editCentralEffectCommand: CommandBuilder = (plugin) => ({
  id: "longform-central-effect",
  name: "Set the central effect",
  callback: () => {
    editCentralEffect(plugin.app);
  },
});

export const editMotifsCommand: CommandBuilder = (plugin) => ({
  id: "longform-edit-motifs",
  name: "Edit story motifs",
  callback: () => {
    editMotifs(plugin.app, false);
  },
});

export const sittingTimeCommand: CommandBuilder = (plugin) => ({
  id: "longform-sitting-time",
  name: "Estimate reading time for one sitting",
  callback: () => {
    sittingTimeNotice(plugin.app);
  },
});
