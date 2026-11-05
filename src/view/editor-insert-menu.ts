import type { Editor, Menu, MenuItem } from "obsidian";

import { insertMarginNoteInto } from "src/commands/margin-note";
import { insertMissingWordInto } from "src/commands/missing-word";
import {
  insertSectionKey,
  insertMenuIndex,
  type InsertCandidate,
  type InsertSectionEntry,
} from "src/model/insert-menu";
import {
  insertDialogueDashInto,
  insertQuotesInto,
} from "src/commands/portuguese";

const MARK_SECTION = "longform-marks";

const MARKS: { title: string; icon: string; run: (editor: Editor) => void }[] = [
  { title: "Insert dialogue dash", icon: "minus", run: insertDialogueDashInto },
  { title: "Insert margin note", icon: "message-square", run: insertMarginNoteInto },
  { title: "Insert quotes", icon: "quote", run: insertQuotesInto },
  { title: "Insert missing word", icon: "bookmark", run: insertMissingWordInto },
];

type LiveMenuItem = {
  submenu?: Menu | null;
  section?: string;
  title?: string;
  titleEl?: HTMLElement;
  dom?: HTMLElement;
};

type LiveMenu = Menu & {
  items?: LiveMenuItem[];
  sections?: string[];
  shown?: boolean;
  submenuConfig?: unknown;
  submenuConfigs?: unknown;
  addSections?: (names: string[]) => void;
};

function itemTitle(item: LiveMenuItem): string {
  if (typeof item.title === "string" && item.title.length > 0) {
    return item.title;
  }
  const fromTitle = textOf(item.titleEl);
  if (fromTitle) {
    return fromTitle;
  }
  return textOf(item.dom);
}

function textOf(el: HTMLElement | undefined): string {
  if (!el) {
    return "";
  }
  const nested = el.querySelector?.(".menu-item-title");
  return (nested?.textContent || el.textContent || "").trim();
}

function liveItems(menu: Menu): { item: LiveMenuItem; candidate: InsertCandidate }[] {
  const items = (menu as LiveMenu).items ?? [];
  return items.map((item) => ({
    item,
    candidate: {
      title: itemTitle(item),
      section: item.section ?? "",
      hasSubmenu: item.submenu != null,
    },
  }));
}

function configEntries(value: unknown): InsertSectionEntry[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    const entries: InsertSectionEntry[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index] as { section?: unknown; id?: unknown; title?: unknown };
      const section =
        typeof entry?.section === "string"
          ? entry.section
          : typeof entry?.id === "string"
            ? entry.id
            : "";
      if (!section) {
        continue;
      }
      entries.push({
        section,
        title: typeof entry.title === "string" ? entry.title : "",
      });
    }
    return entries;
  }
  const entries: InsertSectionEntry[] = [];
  const record = value as Record<string, { title?: unknown } | undefined>;
  for (const section in record) {
    if (!Object.prototype.hasOwnProperty.call(record, section)) {
      continue;
    }
    const config = record[section];
    entries.push({
      section,
      title: config && typeof config.title === "string" ? config.title : "",
    });
  }
  return entries;
}

function insertSection(menu: LiveMenu): string | null {
  const fromConfigs = insertSectionKey(
    configEntries(menu.submenuConfigs).concat(configEntries(menu.submenuConfig))
  );
  if (fromConfigs) {
    return fromConfigs;
  }
  const items = menu.items ?? [];
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].section === "insert") {
      return "insert";
    }
  }
  return null;
}

function ensureSection(menu: LiveMenu, section: string): void {
  if (typeof menu.addSections === "function") {
    menu.addSections([section]);
  }
  if (Array.isArray(menu.sections) && menu.sections.indexOf(section) < 0) {
    menu.sections.push(section);
  }
}

function addMarks(menu: Menu, editor: Editor, section: string, label: boolean): void {
  const host = menu as LiveMenu;
  const wasShown = host.shown === true;
  if (wasShown) {
    host.shown = false;
  }
  ensureSection(host, section);
  if (label) {
    menu.addItem((item: MenuItem) => {
      item.setTitle("Marks").setSection(section).setIsLabel(true);
    });
  }
  for (let index = 0; index < MARKS.length; index += 1) {
    const mark = MARKS[index];
    menu.addItem((item: MenuItem) => {
      item
        .setTitle(mark.title)
        .setIcon(mark.icon)
        .setSection(section)
        .onClick(() => {
          mark.run(editor);
          editor.focus();
        });
    });
  }
  if (wasShown) {
    host.shown = true;
  }
}

/**
 * Adds the four writing marks inside Insert.
 * Current Obsidian builds Inserir from a section at show time, so the items
 * join that section. Older menus still expose a real submenu.
 */
export function addWritingMarks(menu: Menu, editor: Editor): void {
  const rows = liveItems(menu);
  const index = insertMenuIndex(rows.map((row) => row.candidate));
  const submenu = index >= 0 ? rows[index].item.submenu : null;
  if (submenu) {
    addMarks(submenu, editor, MARK_SECTION, false);
    return;
  }
  const section = insertSection(menu as LiveMenu);
  if (!section) {
    return;
  }
  addMarks(menu, editor, section, true);
}
