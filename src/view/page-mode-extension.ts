import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

import { pageLineMarks } from "./page-mode";

const MARK_CLASSES = ["longform-current-paragraph", "longform-current-line"];

function leafOf(view: EditorView): Element | null {
  return view.dom.closest(".longform-leaf");
}

function clearMarks(view: EditorView): void {
  view.contentDOM.querySelectorAll(".cm-line").forEach((line) => {
    line.classList.remove(...MARK_CLASSES);
  });
}

/**
 * Paints the current paragraph on the existing line elements.
 * Line decorations are avoided: in Live Preview they were copied into the note.
 */
function paint(view: EditorView): void {
  clearMarks(view);
  const leaf = leafOf(view);
  if (!leaf) {
    return;
  }
  const focus = leaf.classList.contains("longform-focus");
  const highlight = leaf.classList.contains("longform-highlight-line");
  if (!focus && !highlight) {
    return;
  }

  const doc = view.state.doc;
  const cursorLine = doc.lineAt(view.state.selection.main.head).number - 1;
  const marks = new Map(
    pageLineMarks(
      doc.lines,
      cursorLine,
      { focus, highlight },
      (index) => doc.line(index + 1).text
    ).map((mark) => [mark.line, mark.classes])
  );

  for (const block of view.viewportLineBlocks) {
    const classes = marks.get(doc.lineAt(block.from).number - 1);
    if (!classes) {
      continue;
    }
    const resolved = view.domAtPos(block.from);
    const node =
      resolved.node.nodeType === Node.ELEMENT_NODE
        ? (resolved.node as HTMLElement)
        : resolved.node.parentElement;
    const line = node?.closest(".cm-line");
    if (!line) {
      continue;
    }
    line.classList.add(...classes.split(" "));
  }
}

function shouldCenter(update: ViewUpdate): boolean {
  return (
    update.selectionSet ||
    update.docChanged ||
    update.focusChanged ||
    update.transactions.some((transaction) =>
      transaction.isUserEvent("longform.page")
    )
  );
}

class PageModeController {
  private queued = false;
  private repaint = 0;

  constructor(view: EditorView) {
    paint(view);
  }

  update(update: ViewUpdate): void {
    paint(update.view);
    // Live Preview rebuilds the line after Enter, which drops the class
    // painted during this update. Paint again once the new line exists.
    if (update.docChanged || update.selectionSet) {
      this.repaintAfterLayout(update.view);
    }
    if (shouldCenter(update)) {
      this.queueCenter(update.view);
    }
  }

  private repaintAfterLayout(view: EditorView): void {
    cancelAnimationFrame(this.repaint);
    this.repaint = requestAnimationFrame(() => {
      this.repaint = requestAnimationFrame(() => {
        if (view.dom.isConnected) {
          paint(view);
        }
      });
    });
  }

  private queueCenter(view: EditorView): void {
    if (this.queued) {
      return;
    }
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      if (!view.dom.isConnected) {
        return;
      }
      const leaf = leafOf(view);
      if (!leaf?.classList.contains("longform-typewriter")) {
        return;
      }
      const head = view.state.selection.main.head;
      const coords = view.coordsAtPos(head);
      if (coords) {
        const rect = view.scrollDOM.getBoundingClientRect();
        const middle = (coords.top + coords.bottom) / 2;
        const target = rect.top + rect.height / 2;
        if (Math.abs(middle - target) < 8) {
          return;
        }
      }
      view.dispatch({
        effects: EditorView.scrollIntoView(head, { y: "center" }),
      });
    });
  }
}

export const longformPageExtension: Extension = ViewPlugin.fromClass(
  PageModeController
);
