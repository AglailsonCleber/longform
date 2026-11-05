/**
 * @vitest-environment happy-dom
 */
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { longformMarginNoteExtension } from "../../src/view/margin-note-extension";

const sample = "Escrita do primeiro parágrafo para testes. %%?Comentário qualquer%%";

function mount(cursor: number): EditorView {
  const host = document.createElement("div");
  host.className = "longform-leaf";
  document.body.appendChild(host);
  return new EditorView({
    parent: host,
    state: EditorState.create({
      doc: sample,
      selection: EditorSelection.cursor(cursor),
      extensions: [longformMarginNoteExtension],
    }),
  });
}

function lineText(view: EditorView): string {
  return view.dom.querySelector(".cm-line")?.textContent ?? "";
}

function settle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

describe("margin note source in the editor", () => {
  const views: EditorView[] = [];

  afterEach(() => {
    while (views.length > 0) {
      const view = views.pop();
      view?.dom.parentElement?.remove();
      view?.destroy();
    }
  });

  it("hides the code while the cursor is in the prose", async () => {
    const view = mount(0);
    views.push(view);
    await settle();
    view.dispatch({ userEvent: "longform.page" });
    await settle();
    const text = lineText(view);
    expect(text.includes("%%")).toBe(false);
    expect(text.includes("Comentário")).toBe(false);
    expect(text.includes("Escrita do primeiro parágrafo")).toBe(true);
  });

  it("hides the code when the cursor rests at the end of the line", async () => {
    const view = mount(sample.length);
    views.push(view);
    await settle();
    view.dispatch({ userEvent: "longform.page" });
    await settle();
    const text = lineText(view);
    expect(text.includes("%%")).toBe(false);
    expect(text.includes("Comentário")).toBe(false);
  });

  it("shows the code when the anchor is clicked and hides it again after leaving", async () => {
    const view = mount(0);
    views.push(view);
    await settle();
    const anchor = view.dom.querySelector(".longform-margin-anchor");
    expect(anchor).not.toBeNull();
    anchor?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    const open = lineText(view);
    expect(open.includes("%%?Comentário qualquer%%")).toBe(true);

    view.dispatch({
      selection: EditorSelection.cursor(0),
    });
    const closed = lineText(view);
    expect(closed.includes("%%")).toBe(false);
    expect(closed.includes("Comentário")).toBe(false);
  });
});
