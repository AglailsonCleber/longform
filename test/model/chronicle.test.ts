import { describe, expect, it } from "vitest";

import {
  ceilingCheck,
  chronicleFromFrontmatter,
  columnCalendar,
  dueSoon,
  holesInCalendar,
  preserveFirstPublication,
} from "src/model/chronicle";

describe("chronicle", () => {
  it("builds a weekly column grid and shows holes before the editor asks", () => {
    const slots = columnCalendar(
      "weekly",
      "2026-11-01",
      4,
      [
        {
          path: "a.md",
          title: "One",
          written: "2026-11-01",
          published: "2026-11-01",
        },
      ]
    );
    expect(slots).toHaveLength(4);
    expect(holesInCalendar(slots)).toHaveLength(3);
  });

  it("warns when the vehicle ceiling is crossed", () => {
    const sheet = chronicleFromFrontmatter({
      "longform-ceiling": 10,
      "longform-ceiling-unit": "words",
    });
    expect(ceilingCheck("one two three four five six seven eight nine ten eleven", sheet).over).toBe(
      true
    );
  });

  it("keeps the first publication when a later venue is recorded", () => {
    const frontmatter: Record<string, unknown> = {};
    preserveFirstPublication(frontmatter, "2020-01-01", "Jornal A");
    preserveFirstPublication(frontmatter, "2026-01-01", "Livro B");
    expect(frontmatter["longform-first-published"]).toBe("2020-01-01");
    expect(frontmatter["longform-first-venue"]).toBe("Jornal A");
    expect(frontmatter["longform-published"]).toBe("2026-01-01");
  });

  it("alerts on a due date without touching the session word goal", () => {
    expect(dueSoon("2026-11-06", "2026-11-04", 3)).toBe(true);
    expect(dueSoon("2026-12-01", "2026-11-04", 3)).toBe(false);
  });
});
