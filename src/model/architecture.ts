import { PLACE_KEY, WHEN_KEY } from "./bible";
import { stripMarginNotes } from "./margin-note";

export const SYNOPSIS_KEY = "longform-synopsis";
export const STATUS_KEY = "longform-status";
export const POV_KEY = "longform-pov";
export const CAST_KEY = "longform-cast";
export const UNIT_KEY = "longform-unit";
export const ROLE_KEY = "longform-role";
export const WRITTEN_KEY = "longform-written";
export const CEILING_KEY = "longform-ceiling";
export const FORM_KEY = "longform-form";

export const PIECE_STATUSES = ["idea", "draft", "revision", "ready"] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

export const PIECE_UNITS = ["book", "part", "act", "chapter", "scene"] as const;
export type PieceUnit = (typeof PIECE_UNITS)[number];

export const PIECE_ROLES = ["manuscript", "cut", "variant", "appendix"] as const;
export type PieceRole = (typeof PIECE_ROLES)[number];

export const TEMPLATE_KINDS = ["scene", "sonnet", "chronicle"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export type PieceSheet = {
  path: string;
  title: string;
  indent: number;
  synopsis: string;
  status: PieceStatus | "";
  pov: string;
  place: string;
  when: string;
  cast: string[];
  unit: PieceUnit | "";
  role: PieceRole | "";
  written: string;
  ceiling: number;
};

export type ContentsLine = {
  title: string;
  indent: number;
  unit: PieceUnit;
  number: string;
  role: PieceRole | "";
};

export type PieceFilter = {
  status: PieceStatus | "";
  pov: string;
  place: string;
  when: string;
  cast: string;
};

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | "" {
  for (const option of options) {
    if (value === option) {
      return option;
    }
  }
  return "";
}

function castOf(value: unknown): string[] {
  if (typeof value === "string") {
    const names: string[] = [];
    for (const part of value.split(",")) {
      const name = part.trim();
      if (name.length > 0) {
        names.push(name);
      }
    }
    return names;
  }
  if (value instanceof Array) {
    const names: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && item.trim().length > 0) {
        names.push(item.trim());
      }
    }
    return names;
  }
  return [];
}

function ceilingOf(value: unknown): number {
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

function recordOf(frontmatter: unknown): Record<string, unknown> {
  if (!frontmatter || typeof frontmatter !== "object") {
    return {};
  }
  return frontmatter as Record<string, unknown>;
}

/** Scene facts live beside the manuscript block, so a project save keeps them. */
export function pieceFromFrontmatter(
  path: string,
  title: string,
  indent: number,
  frontmatter: unknown
): PieceSheet {
  const record = recordOf(frontmatter);
  return {
    path,
    title,
    indent,
    synopsis: textOf(record[SYNOPSIS_KEY]),
    status: oneOf(record[STATUS_KEY], PIECE_STATUSES),
    pov: textOf(record[POV_KEY]),
    place: textOf(record[PLACE_KEY]),
    when: textOf(record[WHEN_KEY]),
    cast: castOf(record[CAST_KEY]),
    unit: oneOf(record[UNIT_KEY], PIECE_UNITS),
    role: oneOf(record[ROLE_KEY], PIECE_ROLES),
    written: textOf(record[WRITTEN_KEY]),
    ceiling: ceilingOf(record[CEILING_KEY]),
  };
}

export function compiles(role: unknown): boolean {
  return role !== "cut" && role !== "variant" && role !== "appendix";
}

export function hasFollowingChild(indents: number[], index: number): boolean {
  const indent = indents[index] ?? 0;
  for (let cursor = index + 1; cursor < indents.length; cursor += 1) {
    if (indents[cursor] <= indent) {
      return false;
    }
    return true;
  }
  return false;
}

/** A leaf is a scene. A parent is a part, an act, or a chapter, by depth. */
export function inferredUnit(indent: number, hasChildren: boolean): PieceUnit {
  if (!hasChildren) {
    return "scene";
  }
  if (indent <= 0) {
    return "part";
  }
  if (indent === 1) {
    return "act";
  }
  return "chapter";
}

export function structureNumbers(indents: number[]): string[] {
  const numbering: number[] = [0];
  let lastIndent = 0;
  const result: string[] = [];
  for (const indent of indents) {
    if (indent > lastIndent) {
      let fill = lastIndent + 1;
      while (fill <= indent) {
        numbering[fill] = 1;
        fill += 1;
      }
      numbering[indent] = 0;
    } else if (indent < lastIndent) {
      numbering.length = indent + 1;
    }
    lastIndent = indent;
    numbering[indent] = (numbering[indent] ?? 0) + 1;
    const parts: string[] = [];
    for (let level = 0; level <= indent; level += 1) {
      parts.push(String(numbering[level]));
    }
    result.push(parts.join("."));
  }
  return result;
}

const UNIT_NAME: Record<PieceUnit, string> = {
  book: "Book",
  part: "Part",
  act: "Act",
  chapter: "Chapter",
  scene: "Scene",
};

export function contentsOf(pieces: PieceSheet[]): ContentsLine[] {
  const visible: PieceSheet[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (!compiles(piece.role)) {
      continue;
    }
    const unit =
      piece.unit ||
      inferredUnit(
        piece.indent,
        hasFollowingChild(
          pieces.map((item) => item.indent),
          index
        )
      );
    visible.push({ ...piece, unit });
  }
  const numbers = structureNumbers(visible.map((piece) => piece.indent));
  const lines: ContentsLine[] = [];
  for (let index = 0; index < visible.length; index += 1) {
    const piece = visible[index];
    lines.push({
      title: piece.title,
      indent: piece.indent,
      unit: piece.unit || "scene",
      number: numbers[index] ?? "",
      role: piece.role,
    });
  }
  return lines;
}

export function contentsMarkdown(lines: ContentsLine[]): string {
  const rows = ["# Contents", ""];
  for (const line of lines) {
    let pad = "";
    for (let level = 0; level < line.indent; level += 1) {
      pad += "  ";
    }
    rows.push(`${pad}${line.number}. ${UNIT_NAME[line.unit]}. ${line.title}`);
  }
  return rows.join("\n");
}

function fold(value: string): string {
  return value.toLocaleLowerCase("pt-BR");
}

export function pieceMatches(piece: PieceSheet, filter: PieceFilter): boolean {
  if (filter.status && piece.status !== filter.status) {
    return false;
  }
  if (filter.pov && !fold(piece.pov).includes(fold(filter.pov))) {
    return false;
  }
  if (filter.place && !fold(piece.place).includes(fold(filter.place))) {
    return false;
  }
  if (filter.when && !fold(piece.when).includes(fold(filter.when))) {
    return false;
  }
  if (filter.cast) {
    const needle = fold(filter.cast);
    let found = false;
    for (const name of piece.cast) {
      if (fold(name).includes(needle)) {
        found = true;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

export function inWritingOrder<T extends { written: string }>(items: T[]): T[] {
  const decorated = items.map((item, index) => ({ item, index }));
  decorated.sort((left, right) => {
    const leftDated = left.item.written.length > 0;
    const rightDated = right.item.written.length > 0;
    if (leftDated && rightDated && left.item.written !== right.item.written) {
      return left.item.written < right.item.written ? -1 : 1;
    }
    if (leftDated !== rightDated) {
      return leftDated ? -1 : 1;
    }
    return left.index - right.index;
  });
  const ordered: T[] = [];
  for (const entry of decorated) {
    ordered.push(entry.item);
  }
  return ordered;
}

export function movePiece<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length
  ) {
    return next;
  }
  const moved = next.splice(from, 1)[0];
  next.splice(to, 0, moved);
  return next;
}

export function manuscriptText(
  parts: { text: string; role: unknown }[]
): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (!compiles(part.role)) {
      continue;
    }
    const withoutFrontmatter = part.text.replace(
      /^---\r?\n[\s\S]*?\r?\n---\r?\n?/,
      ""
    );
    const body = stripMarginNotes(withoutFrontmatter).trim();
    if (body.length > 0) {
      chunks.push(body);
    }
  }
  return chunks.join("\n\n---\n\n");
}

function stanza(start: number, count: number): string {
  const lines: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    lines.push(String(start + offset));
  }
  return lines.join("\n");
}

export function templateBody(kind: TemplateKind): string {
  if (kind === "sonnet") {
    return [stanza(1, 4), stanza(5, 4), stanza(9, 3), stanza(12, 3)].join(
      "\n\n"
    );
  }
  if (kind === "chronicle") {
    return [
      "Fact",
      "",
      "What happened:",
      "",
      "Where:",
      "",
      "When:",
      "",
      "The column.",
    ].join("\n");
  }
  return "The scene.\n";
}

export function applyTemplate(
  frontmatter: Record<string, unknown>,
  kind: TemplateKind,
  fillOnlyBlanks: boolean
): void {
  const fields: Record<string, unknown> = {
    [STATUS_KEY]: "idea",
    [ROLE_KEY]: "manuscript",
  };
  if (kind === "scene") {
    fields[SYNOPSIS_KEY] = "";
    fields[POV_KEY] = "";
    fields[PLACE_KEY] = "";
    fields[WHEN_KEY] = "";
    fields[CAST_KEY] = [];
    fields[UNIT_KEY] = "scene";
  }
  if (kind === "sonnet") {
    fields[FORM_KEY] = "verse";
    fields[UNIT_KEY] = "scene";
  }
  if (kind === "chronicle") {
    fields[FORM_KEY] = "column";
    fields[CEILING_KEY] = 800;
    fields[UNIT_KEY] = "scene";
  }
  for (const key of Object.keys(fields)) {
    const current = frontmatter[key];
    const blank =
      current === undefined ||
      current === null ||
      current === "" ||
      (current instanceof Array && current.length === 0);
    if (fillOnlyBlanks && !blank) {
      continue;
    }
    frontmatter[key] = fields[key];
  }
}

export function assignPiece(
  frontmatter: Record<string, unknown>,
  fields: Pick<
    PieceSheet,
    | "synopsis"
    | "status"
    | "pov"
    | "place"
    | "when"
    | "cast"
    | "unit"
    | "role"
    | "written"
    | "ceiling"
  >
): void {
  const text: [string, string][] = [
    [SYNOPSIS_KEY, fields.synopsis],
    [STATUS_KEY, fields.status],
    [POV_KEY, fields.pov],
    [PLACE_KEY, fields.place],
    [WHEN_KEY, fields.when],
    [UNIT_KEY, fields.unit],
    [ROLE_KEY, fields.role === "manuscript" ? "" : fields.role],
    [WRITTEN_KEY, fields.written],
  ];
  for (const [key, value] of text) {
    if (value.trim().length === 0) {
      delete frontmatter[key];
    } else {
      frontmatter[key] = value.trim();
    }
  }
  if (fields.cast.length === 0) {
    delete frontmatter[CAST_KEY];
  } else {
    frontmatter[CAST_KEY] = fields.cast;
  }
  const ceiling = Number(fields.ceiling);
  if (ceiling > 0) {
    frontmatter[CEILING_KEY] = Math.floor(ceiling);
  } else {
    delete frontmatter[CEILING_KEY];
  }
}

export function proseIsEmpty(text: string): boolean {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim().length === 0;
}
