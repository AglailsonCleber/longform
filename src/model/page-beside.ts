import type { Draft } from "./types";

function notePath(parent: string, folder: string, name: string): string {
  return [parent, folder, `${name}.md`].filter((part) => part.length > 0).join("/");
}

export type BesideEditorState = {
  mode: "source" | "preview";
  source: boolean;
};

/** The editing or reading mode of the page that is already open. */
export function matchingEditorState(state: {
  mode?: unknown;
  source?: unknown;
} | null | undefined): BesideEditorState | null {
  if (!state || (state.mode !== "source" && state.mode !== "preview")) {
    return null;
  }
  return { mode: state.mode, source: state.source === true };
}

export type BesideTarget = {
  path: string;
  label: string;
  kind: "page" | "draft" | "note";
};

/**
 * What can sit beside the open page: the page itself in a second pane,
 * the same scene in another draft, and notes kept in the project
 * outside the manuscript.
 */
export function besideTargets(
  currentPath: string,
  current: Draft,
  sceneName: string,
  projectDrafts: Draft[]
): BesideTarget[] {
  const targets: BesideTarget[] = [
    { path: currentPath, label: "This page", kind: "page" },
  ];
  const parent = current.vaultPath.split("/").slice(0, -1).join("/");

  for (const draft of projectDrafts) {
    if (draft.vaultPath === current.vaultPath) {
      continue;
    }
    const label = draft.draftTitle?.trim() || "Other draft";
    if (draft.format === "single") {
      targets.push({ path: draft.vaultPath, label, kind: "draft" });
      continue;
    }
    const scene = draft.scenes.find((item) => item.title === sceneName);
    if (!scene) {
      continue;
    }
    const root = draft.vaultPath.split("/").slice(0, -1).join("/");
    targets.push({
      path: notePath(root, draft.sceneFolder, scene.title),
      label,
      kind: "draft",
    });
  }

  if (current.format === "scenes") {
    for (const name of current.unknownFiles) {
      targets.push({
        path: notePath(parent, current.sceneFolder, name),
        label: name,
        kind: "note",
      });
    }
  }

  return targets.filter(
    (target, index, all) =>
      all.findIndex((item) => item.path === target.path) === index
  );
}
