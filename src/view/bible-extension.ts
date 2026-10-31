import type { Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { get } from "svelte/store";

import { cardsForProject, nameHitsInLine, type BibleCard } from "src/model/bible";
import { bibleCards } from "src/model/bible-store";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";

function inLongformLeaf(view: EditorView): boolean {
  return view.dom.closest(".longform-leaf") !== null;
}

function marks(view: EditorView, cards: BibleCard[]): DecorationSet {
  if (!inLongformLeaf(view) || cards.length === 0) {
    return Decoration.none;
  }
  const byPath = new Map(cards.map((card) => [card.path, card]));
  const ranges = [];
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      for (const hit of nameHitsInLine(line.text, cards)) {
        const card = byPath.get(hit.cardPath);
        ranges.push(
          Decoration.mark({
            class: "longform-card-name",
            attributes: {
              "data-longform-card": hit.cardPath,
              "data-longform-name": hit.name,
              "data-longform-status": card?.status ?? "hypothesis",
              "data-longform-basis": card?.basis ?? "invention",
            },
          }).range(line.from + hit.from, line.from + hit.to)
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

class CardNames {
  decorations: DecorationSet;
  private cards: BibleCard[] = [];
  private tip: HTMLElement;
  private unsubscribe: () => void;
  private ready = false;

  constructor(private view: EditorView) {
    this.tip = document.createElement("div");
    this.tip.className = "longform-card-tip";
    this.tip.hidden = true;
    this.view.dom.appendChild(this.tip);
    this.view.dom.addEventListener("mousemove", this.onMove);
    this.view.dom.addEventListener("mouseleave", this.hide);
    this.view.dom.addEventListener("click", this.onClick);
    this.unsubscribe = bibleCards.subscribe(() => {
      this.cards = this.currentCards();
      this.decorations = marks(this.view, this.cards);
      if (this.ready) {
        this.view.dispatch({ userEvent: "longform.bible" });
      }
    });
    this.cards = this.currentCards();
    this.decorations = marks(view, this.cards);
    this.ready = true;
  }

  update(update: ViewUpdate): void {
    const nudged = update.transactions.some(
      (transaction) =>
        transaction.isUserEvent("longform.page") ||
        transaction.isUserEvent("longform.bible")
    );
    if (update.docChanged || update.viewportChanged || nudged) {
      this.cards = this.currentCards();
      this.decorations = marks(update.view, this.cards);
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.view.dom.removeEventListener("mousemove", this.onMove);
    this.view.dom.removeEventListener("mouseleave", this.hide);
    this.view.dom.removeEventListener("click", this.onClick);
    this.tip.remove();
  }

  private currentCards(): BibleCard[] {
    const leaf = this.view.dom.closest("[data-longform-path]");
    const path = leaf?.getAttribute("data-longform-path") ?? "";
    const draft = path ? draftForPath(path, get(drafts)) : null;
    if (!draft) {
      return [];
    }
    return cardsForProject(get(bibleCards), draft.title);
  }

  private onMove = (event: MouseEvent): void => {
    const mark = (event.target as HTMLElement | null)?.closest?.(
      ".longform-card-name"
    );
    if (!(mark instanceof HTMLElement)) {
      this.hide();
      return;
    }
    const path = mark.dataset.longformCard ?? "";
    const card = this.cards.find((item) => item.path === path);
    if (!card) {
      this.hide();
      return;
    }
    const names = card.names.join(", ");
    const bond = card.bonds[0];
    const bondText = bond
      ? `${bond.label || "bond"} · ${bond.with} · ${bond.from}${
          bond.until ? `–${bond.until}` : ""
        }`
      : "";
    this.tip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = card.names[0];
    this.tip.appendChild(title);
    const meta = document.createElement("div");
    meta.textContent = `${card.kind} · ${card.status} · ${card.basis}`;
    this.tip.appendChild(meta);
    if (names !== card.names[0]) {
      const aliases = document.createElement("div");
      aliases.textContent = names;
      this.tip.appendChild(aliases);
    }
    if (bondText.length > 0) {
      const line = document.createElement("div");
      line.textContent = bondText;
      this.tip.appendChild(line);
    }
    if (card.voice.never.length > 0) {
      const never = document.createElement("div");
      never.textContent = `Never says: ${card.voice.never.join(", ")}`;
      this.tip.appendChild(never);
    }
    const rect = this.view.dom.getBoundingClientRect();
    this.tip.hidden = false;
    this.tip.style.left = `${event.clientX - rect.left + 8}px`;
    this.tip.style.top = `${event.clientY - rect.top + 16}px`;
  };

  private hide = (): void => {
    this.tip.hidden = true;
  };

  private onClick = (event: MouseEvent): void => {
    const mark = (event.target as HTMLElement | null)?.closest?.(
      ".longform-card-name"
    );
    if (!(mark instanceof HTMLElement)) {
      return;
    }
    const path = mark.dataset.longformCard ?? "";
    if (path.length === 0) {
      return;
    }
    this.view.dom.dispatchEvent(
      new CustomEvent("longform-open-card", {
        bubbles: true,
        detail: { path },
      })
    );
  };
}

export const longformBibleExtension: Extension = ViewPlugin.fromClass(CardNames, {
  decorations: (plugin) => plugin.decorations,
});
