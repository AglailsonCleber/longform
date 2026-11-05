import { describe, expect, it } from "vitest";

import {
  noteOwnedByProject,
  pathCoveredByFolder,
  projectDeletionPlan,
  sceneFolderIsDedicated,
} from "src/model/project-deletion";
import type { Draft } from "src/model/types";

const novel: Draft = {
  format: "scenes",
  title: "My Novel",
  titleInFrontmatter: true,
  draftTitle: null,
  vaultPath: "Books/My Novel/Index.md",
  workflow: null,
  sceneFolder: "scenes",
  scenes: [{ title: "One", indent: 0 }],
  ignoredFiles: null,
  unknownFiles: ["extra"],
  sceneTemplate: null,
};

describe("project deletion", () => {
  it("removes the index, the scene folder, and the side folders", () => {
    const plan = projectDeletionPlan([novel], {
      "Books/My Novel/Index.md": "Books/My Novel",
    });
    expect(plan.files).toEqual(["Books/My Novel/Index.md"]);
    expect(plan.folders).toContain("Books/My Novel/scenes");
    expect(plan.folders).toContain("Books/My Novel/Pesquisa");
    expect(plan.folders).toContain("Books/My Novel/Bíblia");
    expect(plan.folders).toContain("Books/My Novel/Reading");
    expect(plan.folders).toContain("Books/My Novel/Output");
    expect(plan.folders).toContain("Books/My Novel/Workshop");
  });

  it("deletes loose scene files when they sit beside the index", () => {
    expect(sceneFolderIsDedicated("/")).toBe(false);
    const plan = projectDeletionPlan(
      [{ ...novel, sceneFolder: "/", vaultPath: "Story.md" }],
      { "Story.md": "" }
    );
    expect(plan.files).toContain("One.md");
    expect(plan.files).toContain("extra.md");
    expect(plan.files).not.toContain("Story.md/scenes");
  });

  it("recognizes research and bible notes kept for the project", () => {
    expect(
      noteOwnedByProject({ "longform-capture": { project: "My Novel" } }, "My Novel")
    ).toBe(true);
    expect(
      noteOwnedByProject({ "longform-card": { project: "My Novel" } }, "Other")
    ).toBe(false);
    expect(pathCoveredByFolder("Books/My Novel/Pesquisa/a.md", "Books/My Novel/Pesquisa")).toBe(
      true
    );
  });
});
