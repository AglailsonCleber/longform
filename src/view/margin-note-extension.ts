import { EditorSelection, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

import {
  cursorInsideMarginNote,
  marginNotesInLine,
  type MarginNote,
} from "src/model/margin-note";

const SYNTAX_CLASS = "longform-margin-syntax";

function lineElement(view: EditorView, pos: number): HTMLElement | null {
  const resolved = view.domAtPos(pos);
  const node =
    resolved.node.nodeType === Node.ELEMENT_NODE
      ? (resolved.node as HTMLElement)
      : resolved.node.parentElement;
  return node?.closest(".cm-line") ?? null;
}

function inLongformLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-leaf") !== null;
}

function syntaxMarks(view: EditorView): DecorationSet {
  if (!inLongformLeaf(view)) {
    return Decoration.none;
  }
  const marks = [];
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      for (const note of marginNotesInLine(line.text)) {
        marks.push(
          Decoration.mark({ class: SYNTAX_CLASS }).range(
            line.from + note.from,
            line.from + note.to
          )
        );
      }
      if (line.to >= to) {
        break;
      }
      pos = line.to + 1;
    }
  }
  return Decoration.set(marks, true);
}

class MarginNoteLayer {
  private readonly layer: HTMLElement;
  private readonly onScroll: () => void;
  decorations: DecorationSet;
  private inLeaf = false;
  private hasNote = false;
  private repaint = 0;

  constructor(private readonly view: EditorView) {
    this.layer = document.createElement("div");
    this.layer.className = "longform-margin-layer";
    view.dom.appendChild(this.layer);
    this.onScroll = () => this.paint(view);
    view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
    this.inLeaf = inLongformLeaf(view);
    this.decorations = syntaxMarks(view);
    this.refreshHasNote(view);
    this.paint(view);
  }

  update(update: ViewUpdate): void {
    const leaf = inLongformLeaf(update.view);
    const leafChanged = leaf !== this.inLeaf;
    const nudged = update.transactions.some((transaction) =>
      transaction.isUserEvent("longform.page")
    );
    if (update.docChanged || update.viewportChanged || leafChanged || nudged) {
      this.inLeaf = leaf;
      this.decorations = syntaxMarks(update.view);
    }
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      leafChanged ||
      nudged
    ) {
      if (update.docChanged || leafChanged || nudged) {
        this.refreshHasNote(update.view);
      }
      this.paint(update.view);
      if (update.docChanged) {
        this.repaintAfterLayout(update.view);
      }
    }
  }

  private repaintAfterLayout(view: EditorView): void {
    cancelAnimationFrame(this.repaint);
    this.repaint = requestAnimationFrame(() => {
      this.repaint = requestAnimationFrame(() => {
        if (view.dom.isConnected) {
          this.paint(view);
        }
      });
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.repaint);
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    this.layer.remove();
    this.view.dom.classList.remove("longform-has-margin-notes");
  }

  private refreshHasNote(view: EditorView): void {
    this.hasNote = false;
    if (!inLongformLeaf(view)) {
      return;
    }
    const doc = view.state.doc;
    for (let number = 1; number <= doc.lines; number += 1) {
      if (marginNotesInLine(doc.line(number).text).length > 0) {
        this.hasNote = true;
        return;
      }
    }
  }

  private paint(view: EditorView): void {
    while (this.layer.firstChild) {
      this.layer.removeChild(this.layer.firstChild);
    }
    view.contentDOM.querySelectorAll(".longform-margin-only").forEach((line) => {
      line.classList.remove("longform-margin-only");
    });
    view.dom.classList.toggle("longform-has-margin-notes", this.hasNote);
    if (!this.hasNote) {
      return;
    }
    const doc = view.state.doc;
    const editorRect = view.dom.getBoundingClientRect();
    const contentRight = view.contentDOM.getBoundingClientRect().right;

    for (const block of view.viewportLineBlocks) {
      const line = doc.lineAt(block.from);
      const notes = marginNotesInLine(line.text);
      if (notes.length === 0) {
        continue;
      }
      const lineEl = lineElement(view, line.from);
      if (
        lineEl &&
        line.text.replace(/%%[ \t]*\?[\s\S]*?%%/g, "").trim() === ""
      ) {
        lineEl.classList.add("longform-margin-only");
      }
      const coords = view.coordsAtPos(line.from);
      if (!coords) {
        continue;
      }
      notes.forEach((note, index) => {
        const element = this.noteElement(
          view,
          line.from,
          note,
          coords.top - editorRect.top + index * 22
        );
        element.style.left = `${contentRight - editorRect.left + 12}px`;
        this.layer.appendChild(element);
      });
    }
  }

  private noteElement(
    view: EditorView,
    lineFrom: number,
    note: MarginNote,
    top: number
  ): HTMLElement {
    const element = document.createElement("div");
    element.className = "longform-margin-note";
    if (note.text.length === 0) {
      element.classList.add("is-empty");
      element.textContent = "…";
    } else {
      element.textContent = note.text;
    }
    element.style.top = `${top}px`;
    element.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const line = view.state.doc.lineAt(lineFrom);
      view.dispatch({
        selection: EditorSelection.cursor(
          line.from + cursorInsideMarginNote(line.text, note)
        ),
      });
      view.focus();
    });
    return element;
  }
}

export const longformMarginNoteExtension: Extension = ViewPlugin.fromClass(
  MarginNoteLayer,
  {
    decorations: (plugin) => plugin.decorations,
  }
);
