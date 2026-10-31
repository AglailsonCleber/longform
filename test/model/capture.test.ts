import { describe, expect, it } from "vitest";

import {
  CAPTURE_KEY,
  captureFromFrontmatter,
  countedWords,
  exercisePageForm,
  exerciseProgress,
  inboxCaptures,
  passageTitle,
  projectCaptures,
  todayStamp,
} from "src/model/capture";

describe("capture notes", () => {
  it("keeps an unassigned note in the inbox", () => {
    const note = captureFromFrontmatter("Captura/frase.md", {
      [CAPTURE_KEY]: { kind: "fragment", project: "" },
    });
    expect(note?.project).toBe("");
    expect(inboxCaptures(note ? [note] : []).map((item) => item.path)).toEqual([
      "Captura/frase.md",
    ]);
    expect(projectCaptures(note ? [note] : [], "Romance")).toEqual([]);
  });

  it("keeps a clipping's source apart from the invented text", () => {
    const note = captureFromFrontmatter("Pesquisa/recorte.md", {
      [CAPTURE_KEY]: {
        kind: "clipping",
        project: "Romance",
        source: { work: "Dom Casmurro", page: "42", url: "", date: "2026-10-30" },
      },
    });
    expect(note?.source.work).toBe("Dom Casmurro");
    expect(note?.source.page).toBe("42");
    expect(note?.kind).toBe("clipping");
  });

  it("dates an observation", () => {
    expect(todayStamp(new Date(2026, 9, 30))).toBe("2026-10-30");
  });

  it("names a note from the selected passage", () => {
    expect(passageTitle("A luz ficou acesa na cozinha por horas.")).toBe(
      "A luz ficou acesa na cozinha"
    );
  });
});

describe("exercises", () => {
  it("counts a flash toward its word goal and reads a sonnet as verse", () => {
    const text = "uma duas três";
    expect(
      exerciseProgress(text, { goal: 500, goalUnit: "words" })
    ).toEqual({ count: 3, goal: 500, unit: "words" });
    expect(exercisePageForm("sonnet")).toBe("verse");
    expect(exercisePageForm("flash")).toBe("prose");
    expect(exercisePageForm("column")).toBe("column");
  });

  it("does not count a private note inside the exercise", () => {
    expect(countedWords("uma duas\n%% segredo %%")).toBe(2);
  });
});
