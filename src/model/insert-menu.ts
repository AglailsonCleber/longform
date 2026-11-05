export type InsertCandidate = {
  title: string;
  section: string;
  hasSubmenu: boolean;
};

export type InsertSectionEntry = {
  section: string;
  title: string;
};

/** Menu titles such as "Inserir" or "Insert…". */
export function isInsertTitle(title: string): boolean {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z\u00c0-\u024f]/g, "");
  return normalized === "insert" || normalized === "inserir";
}

/**
 * The editor's Insert submenu. A translated title wins.
 * The section id is the fallback when the title is not Insert or Inserir.
 */
export function insertMenuIndex(items: InsertCandidate[]): number {
  let bySection = -1;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.hasSubmenu) {
      continue;
    }
    if (isInsertTitle(item.title)) {
      return index;
    }
    if (item.section === "insert" && bySection < 0) {
      bySection = index;
    }
  }
  return bySection;
}

/**
 * Section id that Obsidian opens as the Insert submenu.
 * A translated title wins over the id "insert".
 */
export function insertSectionKey(entries: InsertSectionEntry[]): string | null {
  let bySection: string | null = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (isInsertTitle(entry.title)) {
      return entry.section;
    }
    if (entry.section === "insert" && bySection === null) {
      bySection = entry.section;
    }
  }
  return bySection;
}
