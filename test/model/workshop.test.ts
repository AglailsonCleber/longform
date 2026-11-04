import { describe, expect, it } from "vitest";

import {
  addAnswer,
  applySuggestion,
  canEnterSwapQueue,
  earnSwapCredit,
  filterSwapQueue,
  phaseOf,
  rolePowers,
  spendSwapCredit,
  visibleThreads,
  type PassageThread,
  type Workshop,
} from "src/model/workshop";

function workshop(partial: Partial<Workshop> = {}): Workshop {
  return {
    id: "w1",
    project: "Livro",
    piecePath: "A.md",
    pieceTitle: "A",
    title: "Round 1",
    frozenPath: "plugins/longform/workshop/w1.md",
    frozenAt: 1,
    invites: [
      { id: "r1", name: "Bia", role: "beta" },
      { id: "r2", name: "Ciro", role: "editor" },
    ],
    critiqueUntil: "2026-11-10",
    questionsUntil: "2026-11-20",
    hideCritiques: true,
    genre: "conto",
    words: 1200,
    status: "open",
    ...partial,
  };
}

describe("workshop", () => {
  it("gives each invite role its powers", () => {
    expect(rolePowers("coauthor").canEdit).toBe(true);
    expect(rolePowers("editor").canSuggest).toBe(true);
    expect(rolePowers("beta").canSuggest).toBe(false);
    expect(rolePowers("sensitivity").canComment).toBe(true);
  });

  it("moves from critique to questions to closed by date", () => {
    const round = workshop();
    expect(phaseOf(round, "2026-11-05")).toBe("critique");
    expect(phaseOf(round, "2026-11-15")).toBe("questions");
    expect(phaseOf(round, "2026-11-21")).toBe("closed");
  });

  it("hides other critiques until a reader delivers their own", () => {
    const threads: PassageThread[] = [
      {
        id: "1",
        workshopId: "w1",
        readerId: "r1",
        readerName: "Bia",
        passage: "A casa",
        text: "Crítica da Bia",
        at: 1,
        parentId: "",
        critique: true,
      },
      {
        id: "2",
        workshopId: "w1",
        readerId: "r2",
        readerName: "Ciro",
        passage: "A casa",
        text: "Crítica do Ciro",
        at: 2,
        parentId: "",
        critique: true,
      },
    ];
    expect(visibleThreads(workshop(), threads, "r3", "2026-11-05")).toEqual([]);
    expect(visibleThreads(workshop(), threads, "r1", "2026-11-05").map((t) => t.id)).toEqual([
      "1",
      "2",
    ]);
    expect(visibleThreads(workshop(), threads, "author", "2026-11-05").length).toBe(2);
  });

  it("applies a suggestion only when accepted into the draft", () => {
    const suggestion = {
      id: "s1",
      workshopId: "w1",
      readerId: "r2",
      readerName: "Ciro",
      original: "gato",
      replacement: "cão",
      status: "pending" as const,
      at: 1,
    };
    expect(applySuggestion("o gato dorme", suggestion)).toBe("o cão dorme");
    expect(applySuggestion("o cão dorme", suggestion)).toBeNull();
  });

  it("keeps beta answers on the question for that frozen round", () => {
    const questions = addAnswer(
      [{ id: "q1", workshopId: "w1", prompt: "O final segura?", answers: [] }],
      "q1",
      { readerId: "r1", readerName: "Bia", text: "Sim.", at: 1 }
    );
    expect(questions[0].answers[0].text).toBe("Sim.");
  });

  it("filters the swap queue by genre and length, and spends a credit to enter", () => {
    const listings = [
      {
        id: "a",
        project: "P",
        piecePath: "A.md",
        pieceTitle: "A",
        genre: "conto",
        words: 1000,
        seeking: true,
        credit: 0,
      },
      {
        id: "b",
        project: "P",
        piecePath: "B.md",
        pieceTitle: "B",
        genre: "poesia",
        words: 200,
        seeking: true,
        credit: 1,
      },
    ];
    expect(filterSwapQueue(listings, "conto", 500, 2000).map((item) => item.id)).toEqual(["a"]);
    expect(canEnterSwapQueue(listings[0])).toBe(false);
    const earned = earnSwapCredit(listings, "a");
    expect(canEnterSwapQueue(earned[0])).toBe(true);
    const spent = spendSwapCredit(earned, "a");
    expect(spent?.[0].seeking).toBe(true);
    expect(spent?.[0].credit).toBe(0);
  });
});
