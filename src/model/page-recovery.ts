export type PageSnapshot = {
  path: string;
  text: string;
  at: number;
};

function sameText(left: string, right: string): boolean {
  return left.replace(/\s+$/g, "") === right.replace(/\s+$/g, "");
}

/**
 * A snapshot is worth offering when it still differs from the file
 * and it was taken after the file was last written.
 */
export function recoveryOffer(
  fileText: string,
  fileMtime: number,
  snapshot: PageSnapshot | null
): PageSnapshot | null {
  if (!snapshot || snapshot.text.trim().length === 0) {
    return null;
  }
  if (sameText(fileText, snapshot.text)) {
    return null;
  }
  if (snapshot.at <= fileMtime) {
    return null;
  }
  return snapshot;
}

/** One copy per note. The oldest copies fall away past the limit. */
export function rememberSnapshot(
  notes: PageSnapshot[],
  next: PageSnapshot,
  limit = 40
): PageSnapshot[] {
  const kept = notes.filter((note) => note.path !== next.path);
  kept.push(next);
  kept.sort((left, right) => right.at - left.at);
  return kept.slice(0, limit);
}
