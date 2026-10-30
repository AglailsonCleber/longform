import { describe, expect, it } from "vitest";

import {
  missingWordEdit,
  missingWordsInDocument,
  missingWordsInLine,
} from "src/model/missing-word";

describe("missing word marker", () => {
  it("finds TK as its own word in prose or verse", () => {
    expect(missingWordsInLine("Ela viu o TK.")).toEqual([{ from: 10, to: 12 }]);
    expect(missingWordsInLine("o TK da rua")).toEqual([{ from: 2, to: 4 }]);
    expect(missingWordsInLine("(TK)")).toEqual([{ from: 1, to: 3 }]);
  });

  it("ignores TK inside another word and a lowercase tk", () => {
    expect(missingWordsInLine("ATK e tk")).toEqual([]);
  });

  it("inserts TK at the cursor and stays after it", () => {
    expect(missingWordEdit("Ela viu o .", 10)).toEqual({
      line: "Ela viu o TK.",
      from: 10,
      to: 12,
    });
  });

  it("selects a marker the cursor is already on", () => {
    expect(missingWordEdit("Ela viu o TK.", 11)).toEqual({
      line: "Ela viu o TK.",
      from: 10,
      to: 12,
    });
  });
});

describe("missing words in a scene", () => {
  it("skips frontmatter and a TK written inside a margin note", () => {
    const scene = [
      "---",
      "title: TK",
      "---",
      "A palavra TK falta.",
      "%%? o TK da nota %%",
    ].join("\n");
    expect(missingWordsInDocument(scene)).toEqual([
      { line: 3, ch: 10, text: "A palavra TK falta." },
    ]);
  });
});
