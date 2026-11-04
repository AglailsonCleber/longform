import { describe, expect, it } from "vitest";

import {
  assignLengthKind,
  dilutingPassages,
  edgeParagraphs,
  lengthStatus,
  motifSightings,
  sittingReadMinutes,
  storyFromFrontmatter,
} from "src/model/story";

describe("story", () => {
  it("sets floor and ceiling for the piece, not a novel", () => {
    const frontmatter: Record<string, unknown> = {};
    assignLengthKind(frontmatter, "flash");
    const sheet = storyFromFrontmatter(frontmatter);
    expect(sheet.floor).toBe(100);
    expect(sheet.ceiling).toBe(1000);
    expect(lengthStatus(1200, sheet).overCeiling).toBe(true);
  });

  it("pins opening and closing paragraphs", () => {
    const edges = edgeParagraphs("Open here.\n\nMiddle.\n\nClose there.");
    expect(edges.open).toBe("Open here.");
    expect(edges.close).toBe("Close there.");
    expect(edges.middle).toBe("Middle.");
  });

  it("flags passages that dilute the central effect", () => {
    const weak = dilutingPassages(
      "The knife decides everything.\n\n" +
        "Meanwhile the weather was dull and the market closed early without drama or decision.",
      "knife decides"
    );
    expect(weak.length).toBeGreaterThan(0);
  });

  it("tracks a motif across several stories and estimates a sitting", () => {
    const sightings = motifSightings(
      [
        {
          path: "a.md",
          title: "A",
          text: "A blue key on the table.",
          motifs: ["blue key"],
        },
        {
          path: "b.md",
          title: "B",
          text: "No key here.",
          motifs: [],
        },
      ],
      ["blue key"]
    );
    expect(sightings.some((item) => item.path === "a.md" && item.count > 0)).toBe(
      true
    );
    expect(sittingReadMinutes(400, 200)).toBe(2);
  });
});
