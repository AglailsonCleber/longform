import { describe, expect, it } from "vitest";

import {
  applyStressCorrection,
  classicalSyllables,
  collectionOverview,
  formGaps,
  formProgress,
  formScaffold,
  phoneticSyllables,
  rhymeDictionary,
  scanPoem,
  soundHits,
} from "src/model/verse";

describe("verse", () => {
  it("counts Portuguese syllables with diphthong and hiatus", () => {
    expect(classicalSyllables("poesia")).toBeGreaterThan(2);
    expect(classicalSyllables("saudade")).toBe(3);
    expect(phoneticSyllables(["de", "água"], true, true)).toBeLessThan(
      classicalSyllables("de") + classicalSyllables("água")
    );
  });

  it("builds a rhyme scheme and keeps stress corrections on the word", () => {
    const stress = applyStressCorrection({}, "sabiá", "sa*biá");
    const scans = scanPoem("A casa\nA asa\n", stress);
    expect(scans[0].rhymeLetter).toBeTruthy();
    expect(scans[1].rhymeLetter).toBeTruthy();
  });

  it("scaffolds a fixed form and reports what still does not close", () => {
    const scaffold = formScaffold("haiku");
    expect(scaffold.split("\n").filter((line) => line.length > 0)).toHaveLength(3);
    const slots = formProgress("cinco\n\n", "haiku");
    expect(formGaps(slots)).toBe(2);
  });

  it("filters a sound rhyme dictionary by syllable count", () => {
    const entries = rhymeDictionary(
      "mar altar lar luar sal",
      "mar",
      1
    );
    expect(entries.some((entry) => entry.kind === "perfect")).toBe(true);
  });

  it("toggles sound layers without rewriting the poem", () => {
    const hits = soundHits("casa clara com calor", {
      alliteration: true,
      assonance: false,
      echo: false,
    });
    expect(hits.every((hit) => hit.kind === "alliteration")).toBe(true);
    expect(
      collectionOverview([
        { path: "a.md", title: "A", text: "um\n\ndois", form: "haiku" },
      ])[0].irregular
    ).toBe(true);
  });
});
