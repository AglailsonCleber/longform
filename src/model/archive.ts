export const WORD_KEY = "longform-words";

export type ArchiveFile = {
  path: string;
  text: string;
};

export type SearchKind = "text" | "card" | "comment" | "research";

export type SearchHit = {
  path: string;
  line: number;
  kind: SearchKind;
  text: string;
};

export type ProjectPiece = {
  path: string;
  text: string;
  kind: "scene" | "card" | "research";
};

const SKIP = new Set(["a", "o", "e", "de", "da", "do", "das", "dos"]);

function fold(value: string): string {
  return value.toLocaleLowerCase("pt-BR");
}

function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split(/\n/).length - 1;
}

function clip(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
}

export function wordsIn(frontmatter: unknown): string[] {
  if (!frontmatter || typeof frontmatter !== "object") {
    return [];
  }
  const raw = (frontmatter as Record<string, unknown>)[WORD_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  const words: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim().length > 0) {
      words.push(item.trim());
    }
  }
  return words;
}

export function bookDictionary(lexicon: string[], nameLists: string[][]): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (word: string): void => {
    const clean = word.trim();
    if (clean.length === 0) {
      return;
    }
    if (/\s/.test(clean)) {
      const parts = clean.split(/\s+/);
      for (const part of parts) {
        push(part);
      }
      return;
    }
    const key = fold(clean);
    if (clean.length < 2 || SKIP.has(key) || seen.has(key)) {
      return;
    }
    if (!/[A-Za-z\u00C0-\u024F]/.test(clean)) {
      return;
    }
    seen.add(key);
    found.push(clean);
  };
  for (const word of lexicon) {
    push(word);
  }
  for (const names of nameLists) {
    for (const name of names) {
      push(name);
    }
  }
  return found;
}

export function withoutWord(words: string[], word: string): string[] {
  const key = fold(word);
  const next: string[] = [];
  for (const item of words) {
    if (fold(item) !== key) {
      next.push(item);
    }
  }
  return next;
}

export function datedStamp(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

export function safeTitle(title: string): string {
  const clean = title.replace(/[<>:"/\\|?*]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : "project";
}

export function folderOutsideVault(folder: string, vaultPath: string): boolean {
  const norm = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "").toLocaleLowerCase("pt-BR");
  const target = norm(folder);
  const vault = norm(vaultPath);
  if (target.length === 0 || vault.length === 0) {
    return false;
  }
  return target !== vault && target.indexOf(`${vault}/`) !== 0;
}

export function safeRelativePath(path: string): string | null {
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.length === 0 || clean.indexOf("..") >= 0 || clean.indexOf(":") >= 0) {
    return null;
  }
  return clean;
}

export function archiveManifest(title: string, when: string, files: ArchiveFile[]): string {
  const lines = [`# ${title}`, "", `Copied: ${when}`, ""];
  for (const file of files) {
    lines.push(`- ${file.path}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function searchPieces(pieces: ProjectPiece[], query: string): SearchHit[] {
  const needle = fold(query.trim());
  if (needle.length === 0) {
    return [];
  }
  const hits: SearchHit[] = [];
  for (const piece of pieces) {
    if (piece.kind === "scene") {
      const body = noteBody(piece.text);
      const origin = piece.text.length - body.length;
      const comments = /%%([\s\S]*?)%%/g;
      let match: RegExpExecArray | null;
      while ((match = comments.exec(body))) {
        const inside = match[1] ?? "";
        if (fold(inside).indexOf(needle) >= 0) {
          hits.push({
            path: piece.path,
            line: lineOf(piece.text, origin + (match.index ?? 0)),
            kind: "comment",
            text: clip(inside),
          });
        }
      }
      const frontLines = piece.text.slice(0, origin).split(/\n/).length - 1;
      const lines = body.split(/\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const prose = lines[index].replace(/%%[\s\S]*?%%/g, " ");
        if (fold(prose).indexOf(needle) >= 0) {
          hits.push({
            path: piece.path,
            line: frontLines + index,
            kind: "text",
            text: clip(prose),
          });
        }
      }
    } else {
      const lines = piece.text.split(/\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (fold(lines[index]).indexOf(needle) >= 0) {
          hits.push({
            path: piece.path,
            line: index,
            kind: piece.kind === "card" ? "card" : "research",
            text: clip(lines[index]),
          });
        }
      }
    }
    if (hits.length >= 80) {
      break;
    }
  }
  return hits.slice(0, 80);
}

function vowelKind(ch: string): "strong" | "weak" | "accented-weak" | "" {
  const c = ch.toLocaleLowerCase("pt-BR");
  if ("áéóâêôàãõ".indexOf(c) >= 0 || "aeo".indexOf(c) >= 0) {
    return "strong";
  }
  if (c === "í" || c === "ú") {
    return "accented-weak";
  }
  if (c === "i" || c === "u") {
    return "weak";
  }
  return "";
}

function silentU(word: string, index: number): boolean {
  if (fold(word.charAt(index)) !== "u" || index === 0) {
    return false;
  }
  const prev = fold(word.charAt(index - 1));
  if (prev !== "q" && prev !== "g") {
    return false;
  }
  const next = fold(word.charAt(index + 1));
  return next === "e" || next === "i" || next === "é" || next === "ê" || next === "í";
}

function nasalPair(current: string, next: string): boolean {
  const a = fold(current);
  const b = fold(next);
  return (a === "ã" && (b === "o" || b === "e")) || (a === "õ" && b === "e");
}

/** Portuguese vowel groups. A diphthong counts once. An accented weak vowel splits. */
export function syllablesInWord(word: string): number {
  let count = 0;
  for (let index = 0; index < word.length; index += 1) {
    if (silentU(word, index)) {
      continue;
    }
    const kind = vowelKind(word.charAt(index));
    if (!kind) {
      continue;
    }
    count += 1;
    const next = word.charAt(index + 1);
    if (nasalPair(word.charAt(index), next)) {
      index += 1;
      continue;
    }
    if (kind === "accented-weak") {
      continue;
    }
    const nextKind = vowelKind(next);
    if (kind === "strong" && nextKind === "weak") {
      index += 1;
      continue;
    }
    if (kind === "weak" && (nextKind === "strong" || nextKind === "weak")) {
      index += 1;
    }
  }
  return count;
}

export function syllablesInText(text: string): number {
  const pattern = /[0-9A-Za-z\u00C0-\u024F]+/g;
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    total += syllablesInWord(match[0]);
  }
  return total;
}
