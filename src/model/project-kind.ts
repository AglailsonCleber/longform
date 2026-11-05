import type { PageForm } from "./page-form";
import type { ProjectKind } from "./types";
import type { ExplorerTab } from "src/view/stores";

export type { ProjectKind };

export const PROJECT_KINDS: { id: ProjectKind; label: string }[] = [
  { id: "novel", label: "Novel" },
  { id: "poetry", label: "Poetry" },
  { id: "story", label: "Story" },
  { id: "chronicle", label: "Chronicle" },
  { id: "script", label: "Script" },
];

const TAB_ORDER: ExplorerTab[] = [
  "Scenes",
  "Structure",
  "Plot",
  "Project",
  "Bible",
  "Capture",
  "Revision",
  "Archive",
  "Life",
  "Output",
  "Workshop",
  "Habit",
  "Verse",
  "Story",
  "Chronicle",
  "Compile",
];

const SHARED: ExplorerTab[] = [
  "Project",
  "Capture",
  "Revision",
  "Archive",
  "Life",
  "Output",
  "Workshop",
  "Habit",
  "Compile",
];

const KIND_TABS: Record<ProjectKind, ExplorerTab[]> = {
  novel: ["Structure", "Plot", "Bible", "Story"],
  poetry: ["Structure", "Verse"],
  story: ["Structure", "Plot", "Bible", "Story"],
  chronicle: ["Structure", "Bible", "Chronicle"],
  script: ["Structure", "Plot", "Bible"],
};

const ALL_SPECIFIC: ExplorerTab[] = [
  "Structure",
  "Plot",
  "Bible",
  "Verse",
  "Story",
  "Chronicle",
];

export function projectKind(value: unknown): ProjectKind | null {
  if (
    value === "novel" ||
    value === "poetry" ||
    value === "story" ||
    value === "chronicle" ||
    value === "script"
  ) {
    return value;
  }
  return null;
}

export function kindLabel(kind: ProjectKind | null | undefined): string {
  if (!kind) {
    return "";
  }
  for (const option of PROJECT_KINDS) {
    if (option.id === kind) {
      return option.label;
    }
  }
  return "";
}

/** Multi for a book or a script. One note for a poem, a story, or a column. */
export function defaultFormat(kind: ProjectKind): "scenes" | "single" {
  if (kind === "novel" || kind === "script") {
    return "scenes";
  }
  return "single";
}

export function defaultPageForm(kind: ProjectKind | null | undefined): PageForm {
  if (kind === "poetry") {
    return "verse";
  }
  if (kind === "chronicle") {
    return "column";
  }
  if (kind === "script") {
    return "script";
  }
  return "prose";
}

export function pageFormsForKind(kind: ProjectKind | null | undefined): PageForm[] {
  if (!kind) {
    return ["prose", "verse", "column", "script"];
  }
  if (kind === "poetry") {
    return ["verse"];
  }
  if (kind === "chronicle") {
    return ["column", "prose"];
  }
  if (kind === "script") {
    return ["script"];
  }
  return ["prose"];
}

/**
 * Tabs for this project. A project with no kind keeps every tab,
 * so books created before this choice do not lose a menu.
 */
export function explorerTabs(draft: {
  format: "scenes" | "single";
  kind?: ProjectKind | null;
}): ExplorerTab[] {
  const allowed = new Set<ExplorerTab>(SHARED);
  if (draft.format === "scenes") {
    allowed.add("Scenes");
  }
  const specific = draft.kind ? KIND_TABS[draft.kind] : ALL_SPECIFIC;
  for (const tab of specific) {
    allowed.add(tab);
  }
  return TAB_ORDER.filter((tab) => allowed.has(tab));
}
