import { describe, expect, it } from "vitest";

import {
  defaultFormat,
  defaultPageForm,
  explorerTabs,
  pageFormsForKind,
  projectKind,
} from "src/model/project-kind";

describe("project kind", () => {
  it("reads a known kind and ignores anything else", () => {
    expect(projectKind("poetry")).toBe("poetry");
    expect(projectKind("novel")).toBe("novel");
    expect(projectKind("")).toBeNull();
    expect(projectKind("essay")).toBeNull();
  });

  it("suggests a format and a page form for the kind", () => {
    expect(defaultFormat("novel")).toBe("scenes");
    expect(defaultFormat("script")).toBe("scenes");
    expect(defaultFormat("story")).toBe("single");
    expect(defaultFormat("poetry")).toBe("single");
    expect(defaultFormat("chronicle")).toBe("single");
    expect(defaultPageForm("poetry")).toBe("verse");
    expect(defaultPageForm("chronicle")).toBe("column");
    expect(defaultPageForm("script")).toBe("script");
    expect(defaultPageForm("novel")).toBe("prose");
  });

  it("keeps every craft tab when the project has no kind", () => {
    const tabs = explorerTabs({ format: "scenes", kind: null });
    expect(tabs).toContain("Verse");
    expect(tabs).toContain("Story");
    expect(tabs).toContain("Chronicle");
    expect(tabs).toContain("Scenes");
  });

  it("shows only the menus of the chosen kind", () => {
    const poetry = explorerTabs({ format: "single", kind: "poetry" });
    expect(poetry).toContain("Verse");
    expect(poetry).not.toContain("Story");
    expect(poetry).not.toContain("Plot");
    expect(poetry).not.toContain("Scenes");
    expect(poetry).toContain("Habit");

    const novel = explorerTabs({ format: "scenes", kind: "novel" });
    expect(novel).toContain("Story");
    expect(novel).toContain("Plot");
    expect(novel).not.toContain("Verse");
    expect(novel).not.toContain("Chronicle");

    const column = explorerTabs({ format: "single", kind: "chronicle" });
    expect(column).toContain("Chronicle");
    expect(column).not.toContain("Verse");
    expect(pageFormsForKind("script")).toEqual(["script"]);
  });
});
