import type { Draft } from "./types";

/** Folders Longform creates beside a project index. */
export const PROJECT_SIDE_FOLDERS = [
  "Pesquisa",
  "Bíblia",
  "Reading",
  "Output",
  "Workshop",
] as const;

export type ProjectDeletionPlan = {
  files: string[];
  folders: string[];
};

export function joinVaultPath(parent: string, child: string): string {
  const left = parent.replace(/\\/g, "/").replace(/\/+$/, "");
  const right = child.replace(/\\/g, "/").replace(/^\/+/, "");
  if (left.length === 0) {
    return right;
  }
  if (right.length === 0) {
    return left;
  }
  return `${left}/${right}`;
}

export function parentOfVaultPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash < 0 ? "" : normalized.slice(0, slash);
}

/** A scene folder of `/` or `.` means the scenes sit beside the index. */
export function sceneFolderIsDedicated(folder: string): boolean {
  const value = folder.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return value.length > 0 && value !== "/" && value !== "." && value !== "./";
}

function pushUnique(list: string[], path: string): void {
  if (path.length > 0 && list.indexOf(path) < 0) {
    list.push(path);
  }
}

/**
 * Files and folders that belong to these drafts.
 * The parent folder itself is left for the caller to remove only when it is empty.
 */
export function projectDeletionPlan(
  drafts: Draft[],
  parents: Record<string, string>
): ProjectDeletionPlan {
  const files: string[] = [];
  const folders: string[] = [];
  for (const draft of drafts) {
    const parent = parents[draft.vaultPath] ?? parentOfVaultPath(draft.vaultPath);
    pushUnique(files, draft.vaultPath);
    for (const name of PROJECT_SIDE_FOLDERS) {
      pushUnique(folders, joinVaultPath(parent, name));
    }
    if (draft.format !== "scenes") {
      continue;
    }
    if (sceneFolderIsDedicated(draft.sceneFolder)) {
      pushUnique(folders, joinVaultPath(parent, draft.sceneFolder));
      continue;
    }
    for (const scene of draft.scenes) {
      const path = joinVaultPath(parent, `${scene.title}.md`);
      if (path !== draft.vaultPath) {
        pushUnique(files, path);
      }
    }
    for (const unknown of draft.unknownFiles) {
      const name = unknown.endsWith(".md") ? unknown : `${unknown}.md`;
      const path = joinVaultPath(parent, name);
      if (path !== draft.vaultPath) {
        pushUnique(files, path);
      }
    }
  }
  return { files, folders };
}

export function noteOwnedByProject(frontmatter: unknown, title: string): boolean {
  if (!title || !frontmatter || typeof frontmatter !== "object") {
    return false;
  }
  const record = frontmatter as Record<string, unknown>;
  const capture = record["longform-capture"];
  if (capture && typeof capture === "object") {
    if ((capture as Record<string, unknown>).project === title) {
      return true;
    }
  }
  const card = record["longform-card"];
  if (card && typeof card === "object") {
    if ((card as Record<string, unknown>).project === title) {
      return true;
    }
  }
  return false;
}

export function pathCoveredByFolder(path: string, folder: string): boolean {
  if (folder.length === 0) {
    return false;
  }
  return path === folder || path.startsWith(`${folder}/`);
}
