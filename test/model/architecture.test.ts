import { describe, expect, it } from "vitest";

import {
  applyTemplate,
  compiles,
  contentsMarkdown,
  contentsOf,
  inferredUnit,
  inWritingOrder,
  manuscriptText,
  movePiece,
  pieceFromFrontmatter,
  pieceMatches,
  templateBody,
  FORM_KEY,
  ROLE_KEY,
  STATUS_KEY,
  SYNOPSIS_KEY,
} from "src/model/architecture";
import type { PieceSheet } from "src/model/architecture";

function sheet(partial: Partial<PieceSheet> & Pick<PieceSheet, "title">): PieceSheet {
  return {
    path: `${partial.title}.md`,
    indent: 0,
    synopsis: "",
    status: "",
    pov: "",
    place: "",
    when: "",
    cast: [],
    unit: "",
    role: "",
    written: "",
    ceiling: 0,
    ...partial,
  };
}

describe("scene cards", () => {
  it("reads the synopsis from beside the manuscript", () => {
    const piece = pieceFromFrontmatter("Cenas/Um.md", "Um", 0, {
      longform: { format: "single" },
      [SYNOPSIS_KEY]: "Ela volta de noite.",
      [STATUS_KEY]: "revision",
    });
    expect(piece.synopsis).toBe("Ela volta de noite.");
    expect(piece.status).toBe("revision");
    expect(pieceFromFrontmatter("Cenas/Um.md", "Um", 0, { longform: {} }).synopsis).toBe(
      ""
    );
  });

  it("filters by point of view and by who is in the scene", () => {
    const pieces = [
      sheet({ title: "Cozinha", pov: "Maria", cast: ["Maria", "João"] }),
      sheet({ title: "Rua", pov: "João", cast: ["João"] }),
    ];
    expect(
      pieces.filter((piece) => pieceMatches(piece, { status: "", pov: "maria", place: "", when: "", cast: "" })).map((piece) => piece.title)
    ).toEqual(["Cozinha"]);
    expect(
      pieces.filter((piece) => pieceMatches(piece, { status: "", pov: "", place: "", when: "", cast: "Maria" })).map((piece) => piece.title)
    ).toEqual(["Cozinha"]);
  });
});

describe("structure", () => {
  it("names a parent part and a leaf scene, unless the writer chose a book", () => {
    expect(inferredUnit(0, true)).toBe("part");
    expect(inferredUnit(1, true)).toBe("act");
    expect(inferredUnit(0, false)).toBe("scene");
    const lines = contentsOf([
      sheet({ title: "Livro primeiro", indent: 0, unit: "book" }),
      sheet({ title: "O porto", indent: 1 }),
      sheet({ title: "Cortada", indent: 1, role: "cut" }),
    ]);
    expect(lines.map((line) => `${line.number} ${line.unit} ${line.title}`)).toEqual([
      "1 book Livro primeiro",
      "1.1 scene O porto",
    ]);
    expect(contentsMarkdown(lines)).toContain("1. Book. Livro primeiro");
    expect(contentsMarkdown(lines)).toContain("1.1. Scene. O porto");
  });

  it("keeps a collection's writing order apart from its reading order", () => {
    const reading = [
      sheet({ title: "Tarde", written: "2026-02-01" }),
      sheet({ title: "Manhã", written: "2024-01-01" }),
      sheet({ title: "Sem data" }),
    ];
    expect(inWritingOrder(reading).map((piece) => piece.title)).toEqual([
      "Manhã",
      "Tarde",
      "Sem data",
    ]);
    expect(movePiece(reading, 0, 2).map((piece) => piece.title)).toEqual([
      "Manhã",
      "Sem data",
      "Tarde",
    ]);
  });

  it("leaves a cut scene, a variant, and an appendix out of the reading", () => {
    expect(compiles("cut")).toBe(false);
    expect(compiles("variant")).toBe(false);
    expect(compiles("appendix")).toBe(false);
    expect(compiles("")).toBe(true);
    expect(compiles("manuscript")).toBe(true);
    const text = manuscriptText([
      { role: "manuscript", text: "---\ntitle: Um\n---\nPrimeira.\n%%? dúvida %%" },
      { role: "cut", text: "Isto saiu do livro." },
      { role: "", text: "Segunda." },
    ]);
    expect(text).toBe("Primeira.\n\n---\n\nSegunda.");
    expect(text.includes("saiu")).toBe(false);
  });
});

describe("form templates", () => {
  it("builds a sonnet of fourteen lines and a column with a ceiling", () => {
    const verse = templateBody("sonnet").split(/\r?\n/).filter((line) => line.trim().length > 0);
    expect(verse).toHaveLength(14);
    const frontmatter: Record<string, unknown> = { [FORM_KEY]: "prose" };
    applyTemplate(frontmatter, "sonnet", true);
    expect(frontmatter[FORM_KEY]).toBe("prose");
    applyTemplate(frontmatter, "chronicle", false);
    expect(frontmatter[FORM_KEY]).toBe("column");
    expect(frontmatter["longform-ceiling"]).toBe(800);
    expect(templateBody("chronicle")).toContain("What happened:");
  });

  it("does not store the piece role inside the longform block", () => {
    const frontmatter: Record<string, unknown> = {};
    applyTemplate(frontmatter, "scene", false);
    expect(frontmatter["longform"]).toBeUndefined();
    expect(frontmatter[ROLE_KEY]).toBe("manuscript");
  });
});
