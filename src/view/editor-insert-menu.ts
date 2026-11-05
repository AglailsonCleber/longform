import type { Editor, Menu } from "obsidian";

import { insertMissingWordInto } from "src/commands/missing-word";
import { insertMenuIndex, type InsertCandidate } from "src/model/insert-menu";
import {
  insertDialogueDashInto,
  insertHyphenInto,
  insertQuotesInto,
} from "src/commands/portuguese";

const MARK_SECTION = "longform-marks";

const MARKS: { title: string; icon: string; run: (editor: Editor) => void }[] = [
  { title: "Insert dialogue dash", icon: "minus", run: insertDialogueDashInto },
  { title: "Insert hyphen", icon: "minus", run: insertHyphenInto },
  { title: "Insert quotes", icon: "quote", run: insertQuotesInto },
  { title: "Insert missing word", icon: "bookmark", run: insertMissingWordInto },
];

type LiveMenuItem = {
  submenu: Menu | null;
  section?: string;
  title?: string;
  titleEl?: HTMLElement;
};

function itemTitle(item: LiveMenuItem): string {
  if (typeof item.title === "string" && item.title.length > 0) {
    return item.title;
  }
  return item.titleEl?.textContent ?? "";
}

function liveItems(menu: Menu): { item: LiveMenuItem; candidate: InsertCandidate }[] {
  const items = (menu as Menu & { items?: LiveMenuItem[] }).items ?? [];
  return items.map((item) => ({
    item,
    candidate: {
      title: itemTitle(item),
      section: item.section ?? "",
      hasSubmenu: item.submenu !== null && item.submenu !== undefined,
    },
  }));
}

/** Adds the four writing marks as their own section inside Insert. */
export function addWritingMarks(menu: Menu, editor: Editor): void {
  const rows = liveItems(menu);
  const index = insertMenuIndex(rows.map((row) => row.candidate));
  const submenu = index >= 0 ? rows[index].item.submenu : null;
  if (!submenu) {
    return;
  }
  for (const mark of MARKS) {
    submenu.addItem((item) => {
      item
        .setTitle(mark.title)
        .setIcon(mark.icon)
        .setSection(MARK_SECTION)
        .onClick(() => {
          mark.run(editor);
          editor.focus();
        });
    });
  }
}
