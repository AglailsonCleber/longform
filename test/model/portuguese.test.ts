import { describe, expect, it } from "vitest";

import {
  applySpan,
  dialogueDashEdit,
  quotedText,
} from "src/model/portuguese";

describe("dialogue dash", () => {
  it("opens a speech line with an em dash and a space", () => {
    const edit = dialogueDashEdit("falou baixo.", 0);
    expect(applySpan("falou baixo.", edit)).toBe("— falou baixo.");
    expect(edit.cursor).toBe(2);
  });

  it("turns a hyphen at the start of the line into the dialogue dash", () => {
    expect(applySpan("- falou.", dialogueDashEdit("- falou.", 0))).toBe(
      "— falou."
    );
    expect(applySpan("-- falou.", dialogueDashEdit("-- falou.", 0))).toBe(
      "— falou."
    );
    expect(applySpan("—falou.", dialogueDashEdit("—falou.", 0))).toBe(
      "— falou."
    );
  });

  it("breaks narration in the middle of the line", () => {
    const line = "ela disse";
    const edit = dialogueDashEdit(line, 3);
    expect(applySpan(line, edit)).toBe("ela — disse");
  });
});

describe("quotes", () => {
  it("wraps a selection and leaves an empty pair open for typing", () => {
    expect(quotedText("casa")).toEqual({
      text: "“casa”",
      cursorOffset: 6,
    });
    expect(quotedText("")).toEqual({ text: "“”", cursorOffset: 1 });
  });
});
