import { MarkdownView, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  GOAL_AMOUNT_KEY,
  GOAL_DUE_KEY,
  GOAL_UNIT_KEY,
  countLines,
  countStanzas,
  countWordsSimple,
  parseProjectUnit,
  sprintFinished,
  sprintRemaining,
  startSprint,
  type ProjectUnit,
} from "src/model/habit";
import {
  habitTick,
  sessionBaseline,
  sprint,
  writingSeconds,
} from "src/model/habit-store";
import { draftForPath } from "src/model/scene-navigation";
import { drafts, pluginSettings, selectedDraft } from "src/model/stores";
import { sessionUnitProgress } from "src/view/stores";
import { AskTextModal } from "src/view/revision/revision-modals";

import type { CommandBuilder } from "./types";

let writingTimer = 0;
let sprintTimer = 0;
let lastUnitNotice = false;

export function noteWritingActivity(app: App, path: string, text: string): void {
  const draft = draftForPath(path, get(drafts));
  if (!draft) {
    return;
  }
  const settings = get(pluginSettings);
  const unit = settings.sessionGoalUnit ?? "words";
  let baseline = get(sessionBaseline);
  if (!baseline || baseline.path !== path) {
    baseline = {
      path,
      lines: countLines(text),
      stanzas: countStanzas(text),
      words: countWordsSimple(text),
    };
    sessionBaseline.set(baseline);
    sessionUnitProgress.set(0);
    lastUnitNotice = false;
  } else if (unit === "lines" || unit === "stanzas") {
    const current =
      unit === "lines" ? countLines(text) : countStanzas(text);
    const start = unit === "lines" ? baseline.lines : baseline.stanzas;
    const produced = Math.max(0, current - start);
    sessionUnitProgress.set(produced);
    maybeNotifyUnitGoal(produced, settings.sessionGoal, settings.notifyOnGoal);
  }

  if (writingTimer === 0) {
    writingTimer = window.setInterval(() => {
      writingSeconds.update((seconds) => seconds + 1);
      const goal = get(pluginSettings).sessionGoal;
      const minutes = get(writingSeconds) / 60;
      if (
        get(pluginSettings).sessionGoalUnit === "minutes" &&
        get(pluginSettings).notifyOnGoal &&
        !lastUnitNotice &&
        minutes >= goal
      ) {
        lastUnitNotice = true;
        new Notice("Session goal reached.");
      }
      habitTick.update((tick) => tick + 1);
    }, 1000);
  }
}

function maybeNotifyUnitGoal(
  produced: number,
  goal: number,
  notify: boolean
): void {
  if (!notify || lastUnitNotice || goal <= 0 || produced < goal) {
    return;
  }
  lastUnitNotice = true;
  new Notice("Session goal reached.");
}

export function resetSessionUnits(): void {
  sessionBaseline.set(null);
  sessionUnitProgress.set(0);
  writingSeconds.set(0);
  lastUnitNotice = false;
  if (writingTimer !== 0) {
    window.clearInterval(writingTimer);
    writingTimer = 0;
  }
}

export function beginSprint(app: App, seconds: number): void {
  const next = startSprint(seconds);
  sprint.set(next);
  if (sprintTimer !== 0) {
    window.clearInterval(sprintTimer);
  }
  sprintTimer = window.setInterval(() => {
    const current = get(sprint);
    if (!current) {
      return;
    }
    habitTick.update((tick) => tick + 1);
    if (sprintFinished(current, Date.now())) {
      stopSprintTimer();
      sprint.set(null);
      new Notice("Sprint finished. No ranking — just the page.");
    }
  }, 500);
  new Notice(`Sprint: ${Math.round(seconds / 60)} minutes. Optional, no ranking.`);
  void app;
}

export function stopSprint(): void {
  stopSprintTimer();
  sprint.set(null);
  habitTick.update((tick) => tick + 1);
}

function stopSprintTimer(): void {
  if (sprintTimer !== 0) {
    window.clearInterval(sprintTimer);
    sprintTimer = 0;
  }
}

export function flushHabitTimers(): void {
  stopSprintTimer();
  if (writingTimer !== 0) {
    window.clearInterval(writingTimer);
    writingTimer = 0;
  }
}

export function sprintLabel(now = Date.now()): string {
  const current = get(sprint);
  if (!current) {
    return "";
  }
  const remaining = sprintRemaining(current, now);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}

export function editProjectGoal(app: App): void {
  const draft = get(selectedDraft);
  if (!draft) {
    new Notice("Open a Longform project first.");
    return;
  }
  const index = app.vault.getAbstractFileByPath(draft.vaultPath);
  if (!(index instanceof TFile)) {
    return;
  }
  new AskTextModal(
    app,
    "Project goal",
    "80000 words 2027-06-01",
    (value) => {
      const parts = value.trim().split(/\s+/);
      const amount = Number(parts[0]);
      if (!amount || amount <= 0) {
        new Notice("Enter an amount, a unit, and an optional due date.");
        return;
      }
      const unit = parseProjectUnit(parts[1] ?? "words") as ProjectUnit;
      const due = parts[2] ?? "";
      void app.fileManager.processFrontMatter(index, (frontmatter) => {
        frontmatter[GOAL_AMOUNT_KEY] = amount;
        frontmatter[GOAL_UNIT_KEY] = unit;
        frontmatter[GOAL_DUE_KEY] = due;
      });
      new Notice(
        `Project goal set: ${amount} ${unit}${due ? ` by ${due}` : ""}. Separate from today's session.`
      );
      habitTick.update((tick) => tick + 1);
    }
  ).open();
}

export const startSprintCommand: CommandBuilder = (plugin) => ({
  id: "longform-start-sprint",
  name: "Start a writing sprint",
  callback: () => {
    new AskTextModal(plugin.app, "Sprint minutes", "25", (value) => {
      const minutes = Number(value);
      if (!minutes || minutes <= 0) {
        return;
      }
      beginSprint(plugin.app, Math.round(minutes * 60));
    }).open();
  },
});

export const stopSprintCommand: CommandBuilder = () => ({
  id: "longform-stop-sprint",
  name: "Stop the writing sprint",
  callback: () => {
    stopSprint();
    new Notice("Sprint stopped.");
  },
});

export const setProjectGoalCommand: CommandBuilder = (plugin) => ({
  id: "longform-set-project-goal",
  name: "Set project goal",
  callback: () => {
    editProjectGoal(plugin.app);
  },
});

export function activeManuscriptWords(app: App): number {
  const draft = get(selectedDraft);
  if (!draft) {
    return 0;
  }
  if (draft.format === "single") {
    const file = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (!(file instanceof TFile)) {
      return 0;
    }
    // Caller should prefer cached counts; this is a sync fallback of 0.
    void file;
    return 0;
  }
  return 0;
}

export function selectionOrPageText(app: App): string {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    return "";
  }
  const selected = view.editor.getSelection();
  return selected.length > 0 ? selected : view.editor.getValue();
}
