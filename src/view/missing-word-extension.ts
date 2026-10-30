import type { Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

import { missingWordsInLine } from "src/model/missing-word";

const MISSING_WORD_CLASS = "longform-missing-word";

function inLongformLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-leaf") !== null;
}

function marks(view: EditorView): DecorationSet {
  if (!inLongformLeaf(view)) {
    return Decoration.none;
  }
  const ranges = [];
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      for (const word of missingWordsInLine(line.text)) {
        ranges.push(
          Decoration.mark({ class: MISSING_WORD_CLASS }).range(
            line.from + word.from,
            line.from + word.to
          )
        );
      }
      if (line.to >= to) {
        break;
      }
      pos = line.to + 1;
    }
  }
  return ranges.length === 0 ? Decoration.none : Decoration.set(ranges, true);
}

class MissingWordMarks {
  decorations: DecorationSet;
  private inLeaf = false;

  constructor(view: EditorView) {
    this.inLeaf = inLongformLeaf(view);
    this.decorations = marks(view);
  }

  update(update: ViewUpdate): void {
    const leaf = inLongformLeaf(update.view);
    const nudged = update.transactions.some((transaction) =>
      transaction.isUserEvent("longform.page")
    );
    if (
      update.docChanged ||
      update.viewportChanged ||
      leaf !== this.inLeaf ||
      nudged
    ) {
      this.inLeaf = leaf;
      this.decorations = marks(update.view);
    }
  }
}

export const longformMissingWordExtension: Extension = ViewPlugin.fromClass(
  MissingWordMarks,
  {
    decorations: (plugin) => plugin.decorations,
  }
);
