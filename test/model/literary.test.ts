import { describe, expect, it } from "vitest";

import {
  EMPTY_CONTEST,
  EMPTY_RIGHTS,
  epubFiles,
  freezeSubmission,
  overdueDeadlines,
  prepareSubmission,
  rightsBlock,
  setPublishedUrl,
  setSubmissionStatus,
  simultaneousConflict,
  stableLinkNote,
  upcomingDeadlines,
  zipStore,
  type Submission,
  type Venue,
} from "src/model/literary";

function venue(partial: Partial<Venue> & Pick<Venue, "id" | "name">): Venue {
  return {
    kind: "magazine",
    simultaneous: true,
    exclusivityDays: 0,
    notes: "",
    ...partial,
  };
}

function base(partial: Partial<Submission> & Pick<Submission, "id" | "piecePath" | "venueId">): Submission {
  return {
    project: "Livro",
    pieceTitle: "Cena",
    status: "prepared",
    preparedAt: 1,
    sentAt: 0,
    decidedAt: 0,
    frozenPath: "",
    rights: { ...EMPTY_RIGHTS },
    contest: { ...EMPTY_CONTEST },
    publishedUrl: "",
    ...partial,
  };
}

describe("submissions", () => {
  it("tracks status from prepared to published", () => {
    let list = prepareSubmission([], {
      id: "1",
      project: "Livro",
      piecePath: "A.md",
      pieceTitle: "A",
      venueId: "v1",
      preparedAt: 10,
      rights: EMPTY_RIGHTS,
      contest: EMPTY_CONTEST,
    });
    expect(list[0].status).toBe("prepared");
    list = freezeSubmission(list, "1", "sent/1.md", 20);
    expect(list[0].status).toBe("sent");
    expect(list[0].frozenPath).toBe("sent/1.md");
    expect(list[0].sentAt).toBe(20);
    list = setSubmissionStatus(list, "1", "reading", 30);
    expect(list[0].status).toBe("reading");
    list = setSubmissionStatus(list, "1", "accepted", 40);
    expect(list[0].decidedAt).toBe(40);
    list = setPublishedUrl(list, "1", "https://revista.example/a");
    expect(list[0].status).toBe("published");
    expect(list[0].rights.first).toBe(true);
  });

  it("warns when an exclusive venue already holds the piece", () => {
    const venues = [
      venue({ id: "a", name: "Revista A", simultaneous: false }),
      venue({ id: "b", name: "Revista B", simultaneous: true }),
    ];
    const open = [base({ id: "1", piecePath: "A.md", venueId: "a", status: "sent" })];
    expect(simultaneousConflict(venues, open, "A.md", "b")).toContain("Revista A");
    expect(simultaneousConflict(venues, open, "B.md", "b")).toBe("");
  });

  it("blocks a new send while exclusivity or first rights still hold", () => {
    const held = [
      base({
        id: "1",
        piecePath: "A.md",
        venueId: "a",
        status: "accepted",
        rights: { first: true, exclusiveUntil: "2030-01-01", republishFrom: "" },
      }),
    ];
    expect(rightsBlock(held, "A.md", "2026-11-04")).toContain("Exclusive until");
    expect(
      rightsBlock(
        [
          base({
            id: "2",
            piecePath: "A.md",
            venueId: "a",
            status: "published",
            rights: { first: true, exclusiveUntil: "", republishFrom: "2030-06-01" },
          }),
        ],
        "A.md",
        "2026-11-04"
      )
    ).toContain("Republication opens");
  });

  it("lists contest deadlines still ahead and overdue prepared pieces", () => {
    const list = [
      base({
        id: "1",
        piecePath: "A.md",
        venueId: "c",
        contest: { deadline: "2026-12-01", fee: "0", rules: "https://rules" },
      }),
      base({
        id: "2",
        piecePath: "B.md",
        venueId: "c",
        contest: { deadline: "2020-01-01", fee: "10", rules: "" },
      }),
    ];
    expect(upcomingDeadlines(list, "2026-11-04").map((item) => item.id)).toEqual(["1"]);
    expect(overdueDeadlines(list, "2026-11-04").map((item) => item.id)).toEqual(["2"]);
  });

  it("keeps a stable publication address outside a feed", () => {
    expect(stableLinkNote("A casa", "https://obra.example/a", "Revista")).toContain(
      "https://obra.example/a"
    );
    expect(stableLinkNote("A casa", "https://obra.example/a", "Revista")).toContain(
      "does not depend on a social feed"
    );
  });

  it("builds an EPUB with cover and body kept apart", () => {
    const files = epubFiles(
      "Livro",
      "Autor",
      [{ title: "Um", text: "A casa.\n\nA rua." }],
      { path: "cover.jpg", mediaType: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) }
    );
    expect(files[0].path).toBe("mimetype");
    expect(files.some((file) => file.path === "OEBPS/cover.xhtml")).toBe(true);
    expect(files.some((file) => file.path === "OEBPS/chapter-1.xhtml")).toBe(true);
    const zip = zipStore(files);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
  });
});
