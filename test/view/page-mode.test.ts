import { describe, expect, it } from "vitest";

import {
  pageLineMarks,
  pageModeClasses,
  paragraphSpan,
  readingMeasureVars,
} from "src/view/page-mode";

const lines = ["Um", "Dois", "", "Três", "Quatro"];
const text = (index: number) => lines[index];

describe("paragraph span", () => {
  it("keeps lines together until a blank line", () => {
    expect(paragraphSpan(lines.length, 0, text)).toEqual({ from: 0, to: 1 });
    expect(paragraphSpan(lines.length, 1, text)).toEqual({ from: 0, to: 1 });
    expect(paragraphSpan(lines.length, 3, text)).toEqual({ from: 3, to: 4 });
  });

  it("treats the blank line under the cursor as its own span", () => {
    expect(paragraphSpan(lines.length, 2, text)).toEqual({ from: 2, to: 2 });
  });
});

describe("page line marks", () => {
  it("marks the whole paragraph and the cursor line when both modes are on", () => {
    expect(
      pageLineMarks(lines.length, 4, { focus: true, highlight: true }, text)
    ).toEqual([
      { line: 3, classes: "longform-current-paragraph" },
      {
        line: 4,
        classes: "longform-current-paragraph longform-current-line",
      },
    ]);
  });

  it("keeps a blank line created with Enter in focus", () => {
    const broken = ["Texto.", ""];
    expect(
      pageLineMarks(
        broken.length,
        1,
        { focus: true, highlight: false },
        (index) => broken[index]
      )
    ).toEqual([
      {
        line: 1,
        classes: "longform-current-paragraph longform-current-line",
      },
    ]);
  });

  it("marks only the cursor line when focus is off", () => {
    expect(
      pageLineMarks(lines.length, 0, { focus: false, highlight: true }, text)
    ).toEqual([{ line: 0, classes: "longform-current-line" }]);
  });

  it("marks nothing when both modes are off", () => {
    expect(
      pageLineMarks(lines.length, 0, { focus: false, highlight: false }, text)
    ).toEqual([]);
  });
});

describe("page mode classes", () => {
  it("lists only the modes that are on", () => {
    expect(
      pageModeClasses({
        highlightCurrentLine: true,
        focusMode: false,
        typewriterMode: true,
      })
    ).toEqual(["longform-highlight-line", "longform-typewriter"]);
  });
});

describe("reading measure", () => {
  it("stays off until the writer turns it on", () => {
    expect(
      readingMeasureVars({
        readingMeasure: false,
        measureWidth: 66,
        lineHeight: 1.7,
        pageMargin: 32,
      })
    ).toBeNull();
  });

  it("clamps width, leading, and margin into a readable column", () => {
    expect(
      readingMeasureVars({
        readingMeasure: true,
        measureWidth: 1000,
        lineHeight: 0,
        pageMargin: Number.NaN,
      })
    ).toEqual({
      "--longform-measure-width": "100ch",
      "--longform-line-height": "1.2",
      "--longform-page-margin": "32px",
    });
  });
});
