import { describe, expect, it } from "vitest";

import {
  cursorInsideMarginNote,
  discountCountedLabel,
  lineForMarginNote,
  marginNoteEdit,
  marginNoteMeasure,
  marginNotesInDocument,
  marginNotesInLine,
  stripMarginNotes,
} from "src/model/margin-note";

describe("margin notes in a line", () => {
  it("reads the question and ignores an ordinary comment", () => {
    expect(marginNotesInLine("Ela saiu. %%? ela já sabia? %%")).toEqual([
      { text: "ela já sabia?", from: 10, to: 30 },
    ]);
    expect(marginNotesInLine("Ela saiu. %% comentário %%")).toEqual([]);
  });
});

describe("margin note edit", () => {
  it("appends a note and leaves the cursor inside it", () => {
    expect(marginNoteEdit("Ela saiu.", 9)).toEqual({
      line: "Ela saiu. %%?  %%",
      cursor: 14,
    });
    expect(marginNoteEdit("", 0)).toEqual({
      line: "%%?  %%",
      cursor: 4,
    });
  });

  it("returns to a note the cursor is already inside", () => {
    const line = "Ela saiu. %%? ela já sabia? %%";
    const note = marginNotesInLine(line)[0];
    expect(marginNoteEdit(line, note.from + 2)).toEqual({
      line,
      cursor: cursorInsideMarginNote(line, note),
    });
  });
});

describe("where a note can be written", () => {
  it("steps past YAML frontmatter", () => {
    const lines = ["---", "longform: true", "---", "Texto."];
    expect(lineForMarginNote(lines, 1)).toBe(3);
    expect(lineForMarginNote(lines, 3)).toBe(3);
  });
});

describe("listing margin notes", () => {
  it("keeps the line of each question", () => {
    const scene = ["Um.", "%%? primeira %%", "Dois. %%? segunda %%"].join("\n");
    expect(marginNotesInDocument(scene)).toEqual([
      { line: 1, ch: 0, text: "primeira" },
      { line: 2, ch: 6, text: "segunda" },
    ]);
  });
});

describe("margin notes in the file count", () => {
  const note = "%%? one two %%";

  it("measures the words and characters inside the note", () => {
    expect(marginNoteMeasure(note)).toEqual({
      words: 2,
      characters: note.length,
    });
    expect(marginNoteMeasure("Texto %% comentário %%")).toEqual({
      words: 0,
      characters: 0,
    });
  });

  it("lowers the word count and then the character count", () => {
    expect(discountCountedLabel("30 palavras\n180 caracteres", 2, note.length)).toBe(
      `${(30 - 2).toLocaleString()} palavras\n${(180 - note.length).toLocaleString()} caracteres`
    );
  });
});

describe("stripping margin notes for compile", () => {
  it("removes an inline question and the space before it", () => {
    expect(stripMarginNotes("Ela atravessou. %%? ela já sabia? %%")).toBe(
      "Ela atravessou."
    );
  });

  it("removes a note that occupies its own line", () => {
    expect(
      stripMarginNotes("Ela atravessou.\n%%? ela já sabia? %%\nNo dia seguinte.")
    ).toBe("Ela atravessou.\nNo dia seguinte.");
  });

  it("keeps a single blank line when the note sat between paragraphs", () => {
    expect(
      stripMarginNotes(
        "Ela atravessou.\n\n%%? ela já sabia? %%\n\nNo dia seguinte."
      )
    ).toBe("Ela atravessou.\n\nNo dia seguinte.");
  });

  it("leaves ordinary comments and an unclosed question", () => {
    const text = "Texto %% comentário %% e %%? sem fechar";
    expect(stripMarginNotes(text)).toBe(text);
  });

  it("removes two questions on the same line", () => {
    expect(stripMarginNotes("A %%? um %% e %%? dois %%.")).toBe("A e.");
  });
});
