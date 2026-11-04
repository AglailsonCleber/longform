import type { TFile } from "obsidian";
import { derived, writable } from "svelte/store";

import {
  drafts,
  draftWordCounts,
  selectedDraft,
  sessions,
  pluginSettings,
} from "src/model/stores";
import {
  type SceneWordStats,
  statsForScene,
  fileNameFromPath,
} from "src/model/note-utils";
import { draftForPath } from "src/model/scene-navigation";
import type { Draft, DraftWordCounts } from "src/model/types";
import { writingSeconds } from "src/model/habit-store";

// Writable stores
export const activeFile = writable<TFile | null>(null);
/** Live lines/stanzas produced this session toward the session goal. */
export const sessionUnitProgress = writable(0);

export type ExplorerTab =
  | "Scenes"
  | "Project"
  | "Compile"
  | "Bible"
  | "Capture"
  | "Structure"
  | "Plot"
  | "Revision"
  | "Archive"
  | "Life"
  | "Output"
  | "Workshop"
  | "Habit"
  | "Verse"
  | "Story"
  | "Chronicle";
export const selectedTab = writable<ExplorerTab>("Project");

const statsFor = (
  file: TFile,
  draft: Draft,
  drafts: Draft[],
  wordCounts: DraftWordCounts
): SceneWordStats | null => {
  if (draft && wordCounts) {
    return statsForScene(file, draft, drafts, wordCounts);
  }
  return null;
};

// Derived stores
export const selectedDraftWordCountStatus = derived(
  [activeFile, selectedDraft, drafts, draftWordCounts],
  ([$activeFile, $selectedDraft, $drafts, $draftWordCounts]) =>
    statsFor($activeFile, $selectedDraft, $drafts, $draftWordCounts)
);

export const activeFileWordCountStatus = derived(
  [activeFile, selectedDraft, drafts, draftWordCounts],
  ([$activeFile, , $drafts, $draftWordCounts]) =>
    statsFor(
      $activeFile,
      $activeFile && draftForPath($activeFile.path, $drafts),
      $drafts,
      $draftWordCounts
    )
);

export const goalProgress = derived(
  [
    selectedDraft,
    sessions,
    pluginSettings,
    activeFile,
    drafts,
    writingSeconds,
    sessionUnitProgress,
  ],
  ([
    $selectedDraft,
    $sessions,
    $pluginSettings,
    $activeFile,
    $drafts,
    $writingSeconds,
    $sessionUnitProgress,
  ]) => {
    if (!$selectedDraft || !$pluginSettings) {
      return 0;
    }

    const goal = $pluginSettings.sessionGoal;
    if (goal <= 0) {
      return 0;
    }

    const unit = $pluginSettings.sessionGoalUnit ?? "words";
    if (unit === "minutes") {
      return $writingSeconds / 60 / goal;
    }
    if (unit === "lines" || unit === "stanzas") {
      return $sessionUnitProgress / goal;
    }

    if ($sessions.length === 0) {
      return 0;
    }

    const latestSession = $sessions[0];

    if ($pluginSettings.applyGoalTo === "all") {
      return latestSession.total / goal;
    } else if ($pluginSettings.applyGoalTo === "project") {
      const draftTotal = latestSession.drafts[$selectedDraft.vaultPath];
      if (draftTotal) {
        return draftTotal.total / goal;
      } else {
        return 0;
      }
    } else {
      if (!$activeFile) {
        return 0;
      }
      const draft = draftForPath($activeFile.path, $drafts);
      if (!draft) {
        return 0;
      }
      const name = fileNameFromPath($activeFile.path);
      const draftTotals = latestSession.drafts[draft.vaultPath];
      if (!draftTotals) {
        return 0;
      }
      if (draft.format === "single") {
        return draftTotals.total / goal;
      } else {
        const sceneTotal = draftTotals.scenes[name] ?? 0;
        return sceneTotal / goal;
      }
    }
  }
);
