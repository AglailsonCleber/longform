import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROSE,
  applyProposal,
  earlierParagraph,
  errandsIn,
  hunksBetween,
  keepHunk,
  missingSceneTitles,
  proseHits,
  recordVersion,
  treatmentSlips,
  undoHunk,
  undoHunkInText,
  wordDiff,
} from "src/model/revision";

describe("versions", () => {
  it("keeps one automatic copy inside the interval and another after it", () => {
    let versions = recordVersion([], { path: "A.md", text: "um", at: 0, name: "" }, 60000);
    versions = recordVersion(versions, { path: "A.md", text: "dois", at: 1000, name: "" }, 60000);
    expect(versions).toHaveLength(1);
    expect(versions[0].text).toBe("dois");
    versions = recordVersion(versions, { path: "A.md", text: "três", at: 70000, name: "" }, 60000);
    versions = recordVersion(versions, { path: "A.md", text: "três", at: 80000, name: "Fim" }, 60000);
    expect(versions.map((version) => version.name)).toEqual(["", "Fim"]);
  });

  it("drops old automatic copies before a named one", () => {
    let versions = recordVersion([], { path: "A.md", text: "a", at: 0, name: "Fechado" }, 1, 2);
    versions = recordVersion(versions, { path: "A.md", text: "b", at: 10, name: "" }, 1, 2);
    versions = recordVersion(versions, { path: "A.md", text: "c", at: 20, name: "" }, 1, 2);
    expect(versions.map((version) => version.text)).toEqual(["Fechado" === versions[0].name ? "a" : "c", "c"]);
    expect(versions.some((version) => version.name === "Fechado")).toBe(true);
  });
});

describe("diff and proposals", () => {
  it("marks the changed word", () => {
    expect(wordDiff("o gato dorme", "o cão dorme").map((op) => `${op.kind}:${op.text}`)).toEqual([
      "same:o",
      "cut:gato",
      "add:cão",
      "same:dorme",
    ]);
    const [hunk] = hunksBetween("o gato dorme", "o cão dorme");
    expect(undoHunk("o cão dorme", hunk)).toBe("o gato dorme");
    expect(keepHunk("o gato dorme", "o cão dorme", 0)).toBe("o cão dorme");
    expect(undoHunkInText("Um\no cão dorme.", hunk)).toBe("Um\no gato dorme.");
  });

  it("returns the earlier wording of one paragraph", () => {
    const earlier = earlierParagraph(
      [{ id: "1", path: "A.md", at: 1, name: "", text: "A casa era azul." }],
      "A.md",
      "A casa era verde."
    );
    expect(earlier).toBe("A casa era azul.");
  });

  it("leaves the manuscript until a proposal is accepted", () => {
    const proposal = {
      id: "1",
      path: "A.md",
      at: 1,
      original: "gato",
      replacement: "cão",
      status: "pending" as const,
    };
    expect(applyProposal("o gato", proposal)).toBe("o cão");
    expect(applyProposal("o cão", proposal)).toBeNull();
  });
});

describe("reading", () => {
  it("notices an echo, a long sentence, a cliché, and an adverb", () => {
    const words: string[] = [];
    for (let count = 0; count < 41; count += 1) {
      words.push("palavra");
    }
    const hits = proseHits(
      `a casa e a casa. De repente, lentamente. ${words.join(" ")}.`,
      DEFAULT_PROSE
    );
    expect(hits.some((hit) => hit.kind === "echo")).toBe(true);
    expect(hits.some((hit) => hit.kind === "cliche")).toBe(true);
    expect(hits.some((hit) => hit.kind === "adverb")).toBe(true);
    expect(hits.some((hit) => hit.kind === "long")).toBe(true);
    expect(proseHits("lentamente", { ...DEFAULT_PROSE, adverb: false })).toEqual([]);
  });

  it("shows a mixed address, a tense slip, and a name in the wrong case", () => {
    const slips = treatmentSlips("Se tu vier, você fica. Eu estava calmo e estou atento. Vi a maria.", [
      { primary: "Maria", aliases: [] },
    ]);
    expect(slips.map((slip) => slip.kind)).toEqual(["address", "tense", "name"]);
  });

  it("lists a missing word, a question, and a comment", () => {
    const items = errandsIn("Falta TK aqui.\n%%? quem chegou %%\n%% cortar depois %%");
    expect(items.map((item) => item.kind)).toEqual(["question", "comment", "tk"]);
  });

  it("offers scenes the other draft has and this one does not", () => {
    expect(missingSceneTitles(["Um"], ["Um", "Dois"])).toEqual(["Dois"]);
  });
});
