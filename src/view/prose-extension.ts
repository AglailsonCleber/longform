import type { Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { get } from "svelte/store";

import { proseHits } from "src/model/revision";
import { proseToggles, readerPaths } from "src/model/revision-store";

const KIND_CLASS = {
  echo: "longform-prose-echo",
  long: "longform-prose-long",
  cliche: "longform-prose-cliche",
  adverb: "longform-prose-adverb",
} as const;

function inLongformLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-leaf") !== null;
}

function marks(view: EditorView): DecorationSet {
  const toggles = get(proseToggles);
  const path = view.dom.closest("[data-longform-path]")?.getAttribute("data-longform-path") ?? "";
  if (!path || !toggles.onPage || !inLongformLeaf(view) || get(readerPaths).indexOf(path) >= 0) {
    return Decoration.none;
  }
  const placed: { from: number; to: number; kind: keyof typeof KIND_CLASS }[] = [];
  const doc = view.state.doc;
  const text = doc.toString();
  for (const hit of proseHits(text, toggles)) {
    if (hit.to <= hit.from || hit.line < 0 || hit.line >= doc.lines) {
      continue;
    }
    const line = doc.line(hit.line + 1);
    const from = line.from + hit.from;
    const to = Math.min(line.from + hit.to, line.to);
    if (from < to) {
      placed.push({ from, to, kind: hit.kind });
    }
  }
  placed.sort((left, right) => left.from - right.from);
  const ranges = [];
  let last = -1;
  for (const hit of placed) {
    if (hit.from >= last) {
      ranges.push(Decoration.mark({ class: KIND_CLASS[hit.kind] }).range(hit.from, hit.to));
      last = hit.to;
    }
  }
  return Decoration.set(ranges);
}

export const longformProseExtension: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private unsubscribe: () => void;
    private ready = false;

    constructor(private view: EditorView) {
      this.decorations = marks(view);
      const refresh = () => {
        if (this.ready) {
          this.decorations = marks(this.view);
          this.view.dispatch({ userEvent: "longform.prose" });
        }
      };
      const unsubscribeProse = proseToggles.subscribe(refresh);
      const unsubscribeReader = readerPaths.subscribe(refresh);
      this.unsubscribe = () => {
        unsubscribeProse();
        unsubscribeReader();
      };
      this.ready = true;
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = marks(update.view);
      }
    }

    destroy(): void {
      this.unsubscribe();
    }
  },
  { decorations: (plugin) => plugin.decorations }
);
