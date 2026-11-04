import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { get } from "svelte/store";

import { craftTick, soundLayers, verseMode } from "src/model/craft-store";
import { scanPoem, soundHits, wordsInLine } from "src/model/verse";

function inLongformLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-leaf") !== null;
}

function isVerseLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-form-verse") !== null;
}

function soundDecorations(view: EditorView): DecorationSet {
  if (!inLongformLeaf(view) || !isVerseLeaf(view)) {
    return Decoration.none;
  }
  const layers = get(soundLayers);
  if (!layers.alliteration && !layers.assonance && !layers.echo) {
    return Decoration.none;
  }
  const marks = [];
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      const hits = soundHits(line.text, layers);
      const words = wordsInLine(line.text);
      let offset = 0;
      const lower = line.text;
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        const at = lower.indexOf(word, offset);
        if (at < 0) {
          continue;
        }
        offset = at + word.length;
        if (hits.some((hit) => hit.index === index)) {
          const kind = hits.find((hit) => hit.index === index)?.kind ?? "echo";
          marks.push(
            Decoration.mark({ class: `longform-sound-${kind}` }).range(
              line.from + at,
              line.from + at + word.length
            )
          );
        }
      }
      if (line.to >= to) {
        break;
      }
      pos = line.to + 1;
    }
  }
  return Decoration.set(marks, true);
}

class VerseMargin {
  decorations: DecorationSet;
  private readonly layer: HTMLElement;
  private readonly onScroll: () => void;
  private unsub: (() => void) | null = null;

  constructor(private readonly view: EditorView) {
    this.layer = document.createElement("div");
    this.layer.className = "longform-verse-margin";
    view.dom.appendChild(this.layer);
    this.onScroll = () => this.paint();
    view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
    this.decorations = soundDecorations(view);
    this.paint();
    this.unsub = craftTick.subscribe(() => {
      this.decorations = soundDecorations(this.view);
      this.paint();
    });
  }

  update(update: ViewUpdate): void {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      update.selectionSet
    ) {
      this.decorations = soundDecorations(update.view);
      this.paint();
    }
  }

  destroy(): void {
    this.unsub?.();
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    this.layer.remove();
  }

  private paint(): void {
    const view = this.view;
    this.layer.innerHTML = "";
    if (!inLongformLeaf(view) || !isVerseLeaf(view)) {
      return;
    }
    const mode = get(verseMode);
    const scans = scanPoem(view.state.doc.toString());
    const rect = view.scrollDOM.getBoundingClientRect();
    for (const { from, to } of view.visibleRanges) {
      let pos = from;
      while (pos <= to) {
        const line = view.state.doc.lineAt(pos);
        const scan = scans[line.number - 1];
        if (scan && scan.text.trim().length > 0) {
          const coords = view.coordsAtPos(line.from);
          if (coords) {
            const label = document.createElement("div");
            label.className = "longform-verse-gutter";
            const count = mode === "phonetic" ? scan.phonetic : scan.classical;
            label.textContent = `${count}${
              scan.rhymeLetter ? ` ${scan.rhymeLetter}` : ""
            }`;
            label.style.top = `${
              coords.top - rect.top + view.scrollDOM.scrollTop
            }px`;
            this.layer.appendChild(label);
          }
        }
        if (line.to >= to) {
          break;
        }
        pos = line.to + 1;
      }
    }
  }
}

export const longformVerseExtension = [
  ViewPlugin.fromClass(VerseMargin, {
    decorations: (value) => value.decorations,
  }),
  EditorView.baseTheme({
    ".longform-verse-margin": {
      position: "absolute",
      left: "0",
      top: "0",
      width: "2.5rem",
      pointerEvents: "none",
      zIndex: "3",
    },
    ".longform-verse-gutter": {
      position: "absolute",
      left: "0.2rem",
      fontSize: "0.7rem",
      color: "var(--text-muted)",
      lineHeight: "var(--line-height-normal)",
    },
  }),
];
