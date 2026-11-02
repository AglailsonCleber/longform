export const VERSION_INTERVAL = 60_000;

export type SceneVersion = {
  id: string;
  path: string;
  at: number;
  name: string;
  text: string;
};

export type DiffOp = {
  kind: "same" | "add" | "cut";
  text: string;
};

export type Hunk = {
  start: number;
  before: string;
  after: string;
};

export type Proposal = {
  id: string;
  path: string;
  at: number;
  original: string;
  replacement: string;
  status: "pending" | "accepted" | "refused";
};

export type TrashedPiece = {
  id: string;
  path: string;
  title: string;
  project: string;
  draftPath: string;
  at: number;
  text: string;
};

export type ProseToggles = {
  echo: boolean;
  longSentence: boolean;
  cliche: boolean;
  adverb: boolean;
  onPage: boolean;
};

export type ProseHit = {
  kind: "echo" | "long" | "cliche" | "adverb";
  line: number;
  from: number;
  to: number;
  text: string;
};

export type TreatmentSlip = {
  kind: "address" | "tense" | "name";
  detail: string;
};

export type Errand = {
  kind: "tk" | "question" | "comment";
  line: number;
  text: string;
};

export const DEFAULT_PROSE: ProseToggles = {
  echo: true,
  longSentence: true,
  cliche: true,
  adverb: true,
  onPage: false,
};

const CLICHES = [
  "no final das contas",
  "de repente",
  "ao mesmo tempo",
  "sem sombra de dúvida",
  "silêncio ensurdecedor",
  "frio na espinha",
];

const STOP = new Set([
  "a", "o", "os", "as", "de", "da", "do", "das", "dos", "que", "em", "um", "uma",
  "para", "com", "não", "se", "por", "mais", "como", "mas", "ao", "ele", "ela", "eu",
]);

function wordsOf(text: string): string[] {
  const words: string[] = [];
  for (const part of text.split(/\s+/)) {
    if (part.length > 0) {
      words.push(part);
    }
  }
  return words;
}

function fold(value: string): string {
  return value.toLocaleLowerCase("pt-BR");
}

export function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function recordVersion(
  versions: SceneVersion[],
  next: { path: string; text: string; at: number; name: string },
  interval = VERSION_INTERVAL,
  limit = 24
): SceneVersion[] {
  const mine = versions.filter((version) => version.path === next.path);
  const others = versions.filter((version) => version.path !== next.path);
  const latest = mine.length > 0 ? mine[mine.length - 1] : null;
  if (latest && latest.text === next.text && next.name.length === 0) {
    return versions;
  }
  if (latest && latest.text === next.text && latest.name.length === 0 && next.name.length > 0) {
    const named = mine.slice();
    named[named.length - 1] = {
      ...latest,
      at: next.at,
      name: next.name,
      id: `${next.path}#${next.at}#${next.name}`,
    };
    return others.concat(trimVersions(named, limit));
  }
  const updated = mine.slice();
  if (
    next.name.length === 0 &&
    latest &&
    latest.name.length === 0 &&
    next.at - latest.at < interval
  ) {
    updated[updated.length - 1] = { ...latest, text: next.text, at: next.at };
  } else {
    updated.push({
      id: `${next.path}#${next.at}#${next.name}`,
      path: next.path,
      at: next.at,
      name: next.name,
      text: next.text,
    });
  }
  return others.concat(trimVersions(updated, limit));
}

function trimVersions(items: SceneVersion[], limit: number): SceneVersion[] {
  const sorted = items.slice().sort((left, right) => left.at - right.at);
  while (sorted.length > limit) {
    let unnamed = -1;
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index].name.length === 0) {
        unnamed = index;
        break;
      }
    }
    if (unnamed >= 0) {
      sorted.splice(unnamed, 1);
    } else {
      sorted.shift();
    }
  }
  return sorted;
}

export function versionsFor(versions: SceneVersion[], path: string): SceneVersion[] {
  const mine: SceneVersion[] = [];
  for (const version of versions) {
    if (version.path === path) {
      mine.push(version);
    }
  }
  mine.sort((left, right) => left.at - right.at);
  return mine;
}

function pushOp(ops: DiffOp[], kind: DiffOp["kind"], text: string): void {
  const last = ops[ops.length - 1];
  if (last && last.kind === kind) {
    last.text = `${last.text} ${text}`;
  } else {
    ops.push({ kind, text });
  }
}

export function wordDiff(before: string, after: string): DiffOp[] {
  const left = wordsOf(before);
  const right = wordsOf(after);
  const rows = left.length + 1;
  const cols = right.length + 1;
  if (rows * cols > 80_000) {
    return [
      { kind: "cut", text: left.join(" ") },
      { kind: "add", text: right.join(" ") },
    ];
  }
  const score: number[][] = [];
  for (let row = 0; row < rows; row += 1) {
    score[row] = [];
    for (let col = 0; col < cols; col += 1) {
      score[row][col] = 0;
    }
  }
  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let col = right.length - 1; col >= 0; col -= 1) {
      if (left[row] === right[col]) {
        score[row][col] = score[row + 1][col + 1] + 1;
      } else {
        score[row][col] = Math.max(score[row + 1][col], score[row][col + 1]);
      }
    }
  }
  const ops: DiffOp[] = [];
  let row = 0;
  let col = 0;
  while (row < left.length && col < right.length) {
    if (left[row] === right[col]) {
      pushOp(ops, "same", left[row]);
      row += 1;
      col += 1;
    } else if (score[row + 1][col] >= score[row][col + 1]) {
      pushOp(ops, "cut", left[row]);
      row += 1;
    } else {
      pushOp(ops, "add", right[col]);
      col += 1;
    }
  }
  while (row < left.length) {
    pushOp(ops, "cut", left[row]);
    row += 1;
  }
  while (col < right.length) {
    pushOp(ops, "add", right[col]);
    col += 1;
  }
  return ops;
}

export function hunksBetween(before: string, after: string): Hunk[] {
  const found: Hunk[] = [];
  let afterIndex = 0;
  let pendingBefore: string[] = [];
  let pendingAfter: string[] = [];
  let start = 0;
  const flush = () => {
    if (pendingBefore.length === 0 && pendingAfter.length === 0) {
      return;
    }
    found.push({
      start,
      before: pendingBefore.join(" "),
      after: pendingAfter.join(" "),
    });
    pendingBefore = [];
    pendingAfter = [];
  };
  for (const op of wordDiff(before, after)) {
    const tokens = wordsOf(op.text);
    if (op.kind === "same") {
      flush();
      afterIndex += tokens.length;
    } else if (op.kind === "cut") {
      if (pendingBefore.length === 0 && pendingAfter.length === 0) {
        start = afterIndex;
      }
      for (const token of tokens) {
        pendingBefore.push(token);
      }
    } else {
      if (pendingBefore.length === 0 && pendingAfter.length === 0) {
        start = afterIndex;
      }
      for (const token of tokens) {
        pendingAfter.push(token);
      }
      afterIndex += tokens.length;
    }
  }
  flush();
  return found;
}

export function keepHunk(before: string, after: string, index: number): string {
  const baseline: string[] = [];
  let hunk = -1;
  let inChange = false;
  for (const op of wordDiff(before, after)) {
    const tokens = wordsOf(op.text);
    if (op.kind === "same") {
      inChange = false;
      for (const token of tokens) {
        baseline.push(token);
      }
      continue;
    }
    if (!inChange) {
      hunk += 1;
      inChange = true;
    }
    if (hunk === index) {
      if (op.kind === "add") {
        for (const token of tokens) {
          baseline.push(token);
        }
      }
    } else if (op.kind === "cut") {
      for (const token of tokens) {
        baseline.push(token);
      }
    }
  }
  return baseline.join(" ");
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertAtWord(text: string, index: number, insertion: string): string | null {
  if (insertion.length === 0) {
    return text;
  }
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = pattern.exec(text))) {
    if (count === index) {
      const at = match.index ?? 0;
      return `${text.slice(0, at)}${insertion} ${text.slice(at)}`;
    }
    count += 1;
  }
  if (count === index) {
    const gap = text.length === 0 || /\s$/.test(text) ? "" : " ";
    return `${text}${gap}${insertion}`;
  }
  return null;
}

/** Puts one change back without flattening the rest of the page. */
export function undoHunkInText(text: string, hunk: Hunk): string | null {
  const bodyStart = text.length - noteBody(text).length;
  const body = text.slice(bodyStart);
  const after = wordsOf(hunk.after);
  const before = wordsOf(hunk.before).join(" ");
  if (after.length > 0) {
    const pieces: string[] = [];
    for (const word of after) {
      pieces.push(escapePattern(word));
    }
    const match = new RegExp(pieces.join("\\s+")).exec(body);
    if (!match || match.index === undefined) {
      return null;
    }
    const from = bodyStart + match.index;
    return text.slice(0, from) + before + text.slice(from + match[0].length);
  }
  const inserted = insertAtWord(body, hunk.start, before);
  if (inserted === null) {
    return null;
  }
  return text.slice(0, bodyStart) + inserted;
}

export function undoHunk(text: string, hunk: Hunk): string {
  const current = wordsOf(text);
  const removed = wordsOf(hunk.after);
  const restored = wordsOf(hunk.before);
  const next = current.slice(0, hunk.start);
  for (const word of restored) {
    next.push(word);
  }
  for (const word of current.slice(hunk.start + removed.length)) {
    next.push(word);
  }
  return next.join(" ");
}

export function paragraphsOf(text: string): string[] {
  const paragraphs: string[] = [];
  for (const block of noteBody(text).split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (trimmed.length > 0) {
      paragraphs.push(trimmed);
    }
  }
  return paragraphs;
}

function sharedPrefix(left: string[], right: string[]): number {
  let count = 0;
  const limit = Math.min(left.length, right.length);
  while (count < limit && left[count] === right[count]) {
    count += 1;
  }
  return count;
}

export function earlierParagraph(
  versions: SceneVersion[],
  path: string,
  current: string
): string {
  const older = versionsFor(versions, path).slice().reverse();
  for (const version of older) {
    let best = "";
    let bestScore = 1;
    for (const paragraph of paragraphsOf(version.text)) {
      if (paragraph === current) {
        continue;
      }
      const score = sharedPrefix(wordsOf(paragraph), wordsOf(current));
      if (score > bestScore) {
        bestScore = score;
        best = paragraph;
      }
    }
    if (best.length > 0) {
      return best;
    }
  }
  return "";
}

export function applyProposal(text: string, proposal: Proposal): string | null {
  if (proposal.original.length === 0) {
    return null;
  }
  const at = text.indexOf(proposal.original);
  if (at < 0) {
    return null;
  }
  return text.slice(0, at) + proposal.replacement + text.slice(at + proposal.original.length);
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split(/\n/).length - 1;
}

export function proseHits(text: string, toggles: ProseToggles): ProseHit[] {
  const hits: ProseHit[] = [];
  const body = noteBody(text);
  const origin = text.length - body.length;
  if (toggles.echo) {
    const seen = new Map<string, number>();
    const pattern = /[0-9A-Za-z\u00C0-\u024F]+/g;
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = pattern.exec(body))) {
      const word = match[0];
      const key = fold(word);
      count += 1;
      const previous = seen.get(key);
      if (
        word.length >= 4 &&
        !STOP.has(key) &&
        previous !== undefined &&
        count - previous <= 40
      ) {
        const from = origin + (match.index ?? 0);
        hits.push({
          kind: "echo",
          line: lineOf(text, from),
          from: from - lineStart(text, from),
          to: from - lineStart(text, from) + word.length,
          text: word,
        });
      }
      seen.set(key, count);
    }
  }
  if (toggles.longSentence) {
    const sentence = /[^.!?\n]+[.!?]?/g;
    let match: RegExpExecArray | null;
    while ((match = sentence.exec(body))) {
      const sentenceText = match[0].trim();
      if (wordsOf(sentenceText).length > 40) {
        const from = origin + (match.index ?? 0);
        const start = from - lineStart(text, from);
        const newline = text.indexOf("\n", from);
        const lineEnd = newline === -1 ? text.length : newline;
        hits.push({
          kind: "long",
          line: lineOf(text, from),
          from: start,
          to: lineEnd - lineStart(text, from),
          text: wordsOf(sentenceText).slice(0, 8).join(" "),
        });
      }
    }
  }
  if (toggles.cliche) {
    const folded = fold(body);
    for (const phrase of CLICHES) {
      const at = folded.indexOf(phrase);
      if (at >= 0) {
        const from = origin + at;
        hits.push({
          kind: "cliche",
          line: lineOf(text, from),
          from: from - lineStart(text, from),
          to: from - lineStart(text, from) + phrase.length,
          text: phrase,
        });
      }
    }
  }
  if (toggles.adverb) {
    const pattern = /[A-Za-z\u00C0-\u024F]{5,}mente\b/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body))) {
      const from = origin + (match.index ?? 0);
      hits.push({
        kind: "adverb",
        line: lineOf(text, from),
        from: from - lineStart(text, from),
        to: from - lineStart(text, from) + match[0].length,
        text: match[0],
      });
    }
  }
  return hits;
}

function lineStart(text: string, index: number): number {
  return text.lastIndexOf("\n", index - 1) + 1;
}

const TU = new Set(["tu", "ti", "contigo"]);
const VOCE = new Set(["você", "vocês", "voce", "voces"]);
const SENHOR = new Set(["senhor", "senhora", "senhores", "senhoras"]);
const PAST = new Set(["estava", "era", "tinha", "fui", "foi", "havia"]);
const PRESENT = new Set(["estou", "sou", "tenho", "vou", "há", "ha"]);

function letterWords(text: string): string[] {
  const words: string[] = [];
  const pattern = /[0-9A-Za-z\u00C0-\u024F']+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    words.push(match[0]);
  }
  return words;
}

export function treatmentSlips(
  text: string,
  names: { primary: string; aliases: string[] }[]
): TreatmentSlip[] {
  const slips: TreatmentSlip[] = [];
  const body = noteBody(text);
  const foldedWords = letterWords(body).map((word) => fold(word));
  let address = 0;
  const seen = new Set<string>();
  for (const word of foldedWords) {
    const group = TU.has(word) ? "tu" : VOCE.has(word) ? "você" : SENHOR.has(word) ? "senhor" : "";
    if (group && !seen.has(group)) {
      seen.add(group);
      address += 1;
    }
  }
  if (address > 1) {
    const modes: string[] = [];
    seen.forEach((mode) => modes.push(mode));
    slips.push({ kind: "address", detail: modes.join(", ") });
  }
  for (const paragraph of paragraphsOf(body)) {
    const tokens = letterWords(paragraph).map((word) => fold(word));
    let past = false;
    let present = false;
    for (const token of tokens) {
      if (PAST.has(token)) {
        past = true;
      }
      if (PRESENT.has(token)) {
        present = true;
      }
    }
    if (past && present) {
      slips.push({ kind: "tense", detail: paragraph.split(/\n/)[0] ?? paragraph });
      break;
    }
  }
  for (const card of names) {
    if (card.primary.length < 2) {
      continue;
    }
    const accepted = new Set<string>();
    accepted.add(card.primary);
    for (const alias of card.aliases) {
      accepted.add(alias);
    }
    const pattern = new RegExp(
      `(^|[^0-9A-Za-z\\u00C0-\\u024F])(${card.primary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^0-9A-Za-z\\u00C0-\\u024F])`,
      "gi"
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body))) {
      const found = match[2] ?? "";
      if (!accepted.has(found) && fold(found) === fold(card.primary)) {
        slips.push({ kind: "name", detail: found });
        break;
      }
    }
  }
  return slips;
}

export function errandsIn(text: string): Errand[] {
  const found: Errand[] = [];
  const comments = /%%([\s\S]*?)%%/g;
  let match: RegExpExecArray | null;
  while ((match = comments.exec(text))) {
    const body = match[1] ?? "";
    const question = /^[ \t]*\?/.test(body);
    found.push({
      kind: question ? "question" : "comment",
      line: lineOf(text, match.index ?? 0),
      text: body.replace(/^[ \t]*\?[ \t]*/, "").trim(),
    });
  }
  const lines = text.split(/\n/);
  for (let line = 0; line < lines.length; line += 1) {
    const pattern = /\bTK\b/g;
    if (pattern.test(lines[line])) {
      found.push({ kind: "tk", line, text: "TK" });
    }
  }
  return found;
}

export function missingSceneTitles(current: string[], other: string[]): string[] {
  const have = new Set(current);
  const titles: string[] = [];
  for (const title of other) {
    if (!have.has(title)) {
      titles.push(title);
    }
  }
  return titles;
}

export function paragraphSpan(
  text: string,
  offset: number
): { from: number; to: number; text: string } | null {
  const paragraphs = paragraphsOf(text);
  if (paragraphs.length === 0) {
    return null;
  }
  const bodyStart = text.length - noteBody(text).length;
  let cursor = bodyStart;
  const body = noteBody(text);
  for (const paragraph of paragraphs) {
    const at = body.indexOf(paragraph, cursor - bodyStart);
    const from = bodyStart + (at < 0 ? 0 : at);
    const to = from + paragraph.length;
    if (offset >= from && offset <= to) {
      return { from, to, text: paragraph };
    }
    cursor = to;
  }
  return { from: bodyStart, to: bodyStart + paragraphs[0].length, text: paragraphs[0] };
}
