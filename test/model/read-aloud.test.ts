import { describe, expect, it } from "vitest";

import {
  READ_ALOUD_PAUSE,
  spokenLine,
  spokenUnits,
  spokenUnitsFromLine,
} from "src/model/read-aloud";

describe("spoken line", () => {
  it("drops a margin note and turns TK into a silence", () => {
    expect(spokenLine("Ela viu o TK. %%? ela já sabia? %%")).toBe(
      "Ela viu o …."
    );
  });
});

describe("spoken units", () => {
  it("pauses between prose paragraphs", () => {
    const scene = ["A luz ficou acesa na cozinha por um longo tempo.", "", "Ela saiu."].join(
      "\n"
    );
    const units = spokenUnits(scene);
    expect(units.map((unit) => unit.text)).toEqual([
      "A luz ficou acesa na cozinha por um longo tempo.",
      "Ela saiu.",
    ]);
    expect(units[0].pauseAfter).toBe(READ_ALOUD_PAUSE.paragraph);
  });

  it("joins long lines of the same paragraph", () => {
    const scene = [
      "A luz ficou acesa na cozinha por um longo tempo enquanto a rua",
      "esperava do lado de fora com o silêncio de depois da chuva.",
    ].join("\n");
    expect(spokenUnits(scene)).toEqual([
      {
        text: "A luz ficou acesa na cozinha por um longo tempo enquanto a rua esperava do lado de fora com o silêncio de depois da chuva.",
        pauseAfter: READ_ALOUD_PAUSE.paragraph,
        fromLine: 0,
        toLine: 1,
      },
    ]);
  });

  it("keeps short prose lines in the same paragraph", () => {
    expect(spokenUnits("a casa\nsem luz").map((unit) => unit.text)).toEqual([
      "a casa sem luz",
    ]);
  });

  it("keeps a long verse on its own line", () => {
    const line =
      "a casa ficou acesa na cozinha por um longo tempo enquanto a rua esperava";
    expect(spokenUnits(line, "verse").map((unit) => unit.text)).toEqual([line]);
  });

  it("pauses after each line of a screenplay", () => {
    const scene = ["INT. COZINHA", "MARIA", "A luz ficou."].join("\n");
    expect(spokenUnits(scene, "script").map((unit) => unit.pauseAfter)).toEqual([
      READ_ALOUD_PAUSE.verse,
      READ_ALOUD_PAUSE.verse,
      READ_ALOUD_PAUSE.paragraph,
    ]);
  });

  it("pauses after each verse and longer after the stanza", () => {
    const poem = ["a casa", "sem luz", "", "o dia"].join("\n");
    const units = spokenUnits(poem, "verse");
    expect(units.map((unit) => [unit.text, unit.pauseAfter])).toEqual([
      ["a casa", READ_ALOUD_PAUSE.verse],
      ["sem luz", READ_ALOUD_PAUSE.stanza],
      ["o dia", READ_ALOUD_PAUSE.stanza],
    ]);
  });

  it("does not read frontmatter or a note that occupies its own line", () => {
    const scene = ["---", "title: Cena", "---", "Texto.", "%%? pergunta %%"].join(
      "\n"
    );
    expect(spokenUnits(scene).map((unit) => unit.text)).toEqual(["Texto."]);
  });

  it("starts at the paragraph under the cursor", () => {
    const units = spokenUnits("Um.\n\nDois.");
    expect(spokenUnitsFromLine(units, 2).map((unit) => unit.text)).toEqual([
      "Dois.",
    ]);
  });
});
