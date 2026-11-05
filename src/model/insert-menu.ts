export type InsertCandidate = {
  title: string;
  section: string;
  hasSubmenu: boolean;
};

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
    const title = item.title.trim().toLowerCase();
    if (title === "insert" || title === "inserir") {
      return index;
    }
    if (item.section === "insert" && bySection < 0) {
      bySection = index;
    }
  }
  return bySection;
}
