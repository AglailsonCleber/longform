import { describe, expect, it } from "vitest";

import {
  recoveryOffer,
  rememberSnapshot,
  type PageSnapshot,
} from "src/model/page-recovery";

const snapshot: PageSnapshot = {
  path: "Cena.md",
  text: "A luz ficou.",
  at: 200,
};

describe("recovery offer", () => {
  it("offers a copy taken after the file was written", () => {
    expect(recoveryOffer("A luz.", 100, snapshot)).toEqual(snapshot);
  });

  it("stays quiet when the file already has that copy", () => {
    expect(recoveryOffer("A luz ficou.\n", 100, snapshot)).toBeNull();
  });

  it("stays quiet when the file is newer than the copy", () => {
    expect(recoveryOffer("A luz.", 300, snapshot)).toBeNull();
  });
});

describe("remembered copies", () => {
  it("keeps one copy per note and drops the oldest", () => {
    const notes = rememberSnapshot(
      [
        { path: "A.md", text: "a", at: 1 },
        { path: "B.md", text: "b", at: 2 },
      ],
      { path: "A.md", text: "aa", at: 3 },
      2
    );
    expect(notes.map((note) => [note.path, note.text])).toEqual([
      ["A.md", "aa"],
      ["B.md", "b"],
    ]);
  });
});
