import { describe, expect, it } from "vitest";

import { pageForm } from "src/model/page-form";

describe("page form", () => {
  it("stays prose until the note asks for another form", () => {
    expect(pageForm(undefined)).toBe("prose");
    expect(pageForm("chapter")).toBe("prose");
    expect(pageForm("verse")).toBe("verse");
    expect(pageForm("column")).toBe("column");
    expect(pageForm("script")).toBe("script");
  });
});
