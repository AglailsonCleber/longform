import { describe, expect, it } from "vitest";

import { insertMenuIndex, type InsertCandidate } from "src/model/insert-menu";

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
});
