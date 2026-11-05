import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

import { pageLineMarks } from "./page-mode";

const MARK_CLASSES = ["longform-current-paragraph", "longform-current-line"];

function leafOf(view: EditorView): Element | null {
  return view.dom.closest(".longform-leaf");
}

function markLanguage(view: EditorView, leaf: Element | null): void {
  if (leaf?.classList.contains("longform-lang-pt")) {
    view.contentDOM.lang = "pt-BR";
    return;
  }
  if (view.contentDOM.lang === "pt-BR") {
    view.contentDOM.removeAttribute("lang");
  }
}

/**
 * The element for a document line in this editor.
 * Side 1 keeps the start of the line from landing on the previous line.
 * A nested preview editor is ignored.
 */
function lineElementAt(view: EditorView, pos: number): HTMLElement | null {
  if (!view.dom.isConnected) {
    return null;
  }
  const line = view.state.doc.lineAt(pos);
  const probe = line.from === line.to ? line.from : Math.min(line.to, line.from + 1);
  const side: -1 | 1 = probe === line.from ? 1 : -1;
  let resolved: { node: Node };
  try {
    resolved = view.domAtPos(probe, side);
  } catch {
    return null;
  }
  const node =
    resolved.node.nodeType === Node.ELEMENT_NODE
      ? (resolved.node as HTMLElement)
      : resolved.node.parentElement;
  const element = node?.closest(".cm-line");
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  if (element.closest(".cm-editor") !== view.dom) {
    return null;
  }
  return element;
}

/**
 * Paints the current paragraph on the existing line elements.
 * Line decorations are avoided: in Live Preview they were copied into the note.
 * Classes already in place are left alone, so a repaint does not restart the fade.
 */
function paint(view: EditorView): void {
  const leaf = leafOf(view);
  markLanguage(view, leaf);
  const focus = leaf?.classList.contains("longform-focus") ?? false;
  const highlight = leaf?.classList.contains("longform-highlight-line") ?? false;
  const wanted = new Map<HTMLElement, string[]>();

  if (leaf && (focus || highlight)) {
    const doc = view.state.doc;
    const cursorLine = doc.lineAt(view.state.selection.main.head).number - 1;
    const marks = pageLineMarks(doc.lines, cursorLine, { focus, highlight }, (index) =>
      doc.line(index + 1).text
    );
    for (const mark of marks) {
      const line = view.state.doc.line(mark.line + 1);
      const element = lineElementAt(view, line.from);
      if (!element) {
        continue;
      }
      const classes = wanted.get(element) ?? [];
      for (const name of mark.classes.split(" ")) {
        if (name.length > 0 && classes.indexOf(name) < 0) {
          classes.push(name);
        }
      }
      wanted.set(element, classes);
    }
  }

  view.contentDOM.querySelectorAll(".cm-line").forEach((node) => {
    if (!(node instanceof HTMLElement) || node.closest(".cm-editor") !== view.dom) {
      return;
    }
    const classes = wanted.get(node) ?? [];
    for (const name of MARK_CLASSES) {
      node.classList.toggle(name, classes.indexOf(name) >= 0);
    }
  });
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
  private readonly observer: MutationObserver;

  constructor(private readonly view: EditorView) {
    // Live Preview replaces .cm-line nodes after the editor update, which
    // drops the focus class. Watch the content and paint again when that happens.
    this.observer = new MutationObserver(() => {
      this.repaintAfterLayout(this.view);
    });
    this.observer.observe(view.contentDOM, { childList: true, subtree: true });
    paint(view);
  }

  update(update: ViewUpdate): void {
    paint(update.view);
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.geometryChanged
    ) {
      this.repaintAfterLayout(update.view);
    }
    if (shouldCenter(update)) {
      this.queueCenter(update.view);
    }
  }

  destroy(): void {
    this.observer.disconnect();
    cancelAnimationFrame(this.repaint);
  }

  private repaintAfterLayout(view: EditorView): void {
    cancelAnimationFrame(this.repaint);
    this.repaint = requestAnimationFrame(() => {
      if (!view.dom.isConnected) {
        return;
      }
      this.observer.disconnect();
      paint(view);
      this.observer.observe(view.contentDOM, { childList: true, subtree: true });
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
