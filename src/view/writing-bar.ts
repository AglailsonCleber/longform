import type { Editor, MarkdownView } from "obsidian";

import { insertMissingWordInto } from "src/commands/missing-word";
import {
  insertDialogueDashInto,
  insertHyphenInto,
  insertQuotesInto,
} from "src/commands/portuguese";

const ACTIONS: { label: string; title: string; run: (editor: Editor) => void }[] =
  [
    { label: "—", title: "Dialogue dash", run: insertDialogueDashInto },
    { label: "“”", title: "Quotes", run: insertQuotesInto },
    { label: "-", title: "Hyphen", run: insertHyphenInto },
    { label: "TK", title: "Missing word", run: insertMissingWordInto },
  ];

/** A bar on the writing page for the marks a thumb needs. */
export function syncWritingBar(
  el: HTMLElement,
  view: MarkdownView | null,
  active: boolean
): void {
  const existing = el.querySelector(":scope > .longform-writing-bar");
  if (!active || !view) {
    existing?.remove();
    return;
  }
  if (existing) {
    return;
  }

  const bar = el.createDiv({ cls: "longform-writing-bar" });
  for (const action of ACTIONS) {
    const button = bar.createEl("button", {
      text: action.label,
      attr: { type: "button", title: action.title },
    });
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      action.run(view.editor);
      view.editor.focus();
    });
  }
}
