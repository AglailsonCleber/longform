import { describe, expect, it } from "vitest";

import {
  insertMenuIndex,
  insertSectionKey,
  type InsertCandidate,
} from "src/model/insert-menu";

const format: InsertCandidate = {
  title: "Format",
  section: "format",
  hasSubmenu: true,
};

describe("insert menu", () => {
  it("picks the Insert submenu by its title", () => {
    const items: InsertCandidate[] = [
      format,
      { title: "Inserir", section: "selection", hasSubmenu: true },
    ];
    expect(insertMenuIndex(items)).toBe(1);
    expect(
      insertMenuIndex([{ title: "Insert", section: "", hasSubmenu: true }])
    ).toBe(0);
  });

  it("falls back to the insert section when the title is translated another way", () => {
    const items: InsertCandidate[] = [
      format,
      { title: "Einfügen", section: "insert", hasSubmenu: true },
      { title: "Paste", section: "insert", hasSubmenu: false },
    ];
    expect(insertMenuIndex(items)).toBe(1);
  });

  it("ignores a menu with no Insert submenu", () => {
    expect(insertMenuIndex([format])).toBe(-1);
  });

  it("matches an Insert title that carries extra punctuation", () => {
    expect(
      insertMenuIndex([
        { title: "Insert…", section: "selection", hasSubmenu: true },
      ])
    ).toBe(0);
  });
});

describe("insert section", () => {
  it("uses the translated title of a section that opens as a submenu", () => {
    expect(
      insertSectionKey([
        { section: "format", title: "Format" },
        { section: "selection", title: "Inserir" },
      ])
    ).toBe("selection");
  });

  it("falls back to the insert section id", () => {
    expect(
      insertSectionKey([
        { section: "format", title: "Format" },
        { section: "insert", title: "Einfügen" },
      ])
    ).toBe("insert");
    expect(insertSectionKey([{ section: "format", title: "Format" }])).toBe(
      null
    );
  });
});
