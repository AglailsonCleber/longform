export const AUTHOR_KEY = "longform-author";
export const DEDICATION_KEY = "longform-dedication";
export const EPIGRAPH_KEY = "longform-epigraph";
export const EPIGRAPH_SOURCE_KEY = "longform-epigraph-source";

export type BookOpening = {
  title: string;
  author: string;
  dedication: string;
  epigraph: string;
  epigraphSource: string;
};

export type SceneSeparatorKind = "title" | "asterism" | "none";

export type BodyForm = "prose" | "verse" | "chronicle" | "column" | "script";

export type ExportFormat = "markdown" | "text" | "html" | "epub" | "docx" | "pdf";

export type SceneForOutput = {
  title: string;
  text: string;
  form: BodyForm;
  when: string;
  indent: number;
};

export type PrintPage = {
  number: number;
  html: string;
};

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function openingFromFrontmatter(
  title: string,
  frontmatter: unknown
): BookOpening {
  const record =
    frontmatter && typeof frontmatter === "object"
      ? (frontmatter as Record<string, unknown>)
      : {};
  return {
    title,
    author: textOf(record[AUTHOR_KEY]),
    dedication: textOf(record[DEDICATION_KEY]),
    epigraph: textOf(record[EPIGRAPH_KEY]),
    epigraphSource: textOf(record[EPIGRAPH_SOURCE_KEY]),
  };
}

export function bodyFormOf(value: unknown): BodyForm {
  const form = textOf(value).toLocaleLowerCase("pt-BR");
  if (form === "verse" || form === "poetry") {
    return "verse";
  }
  if (form === "chronicle" || form === "crônica" || form === "cronica") {
    return "chronicle";
  }
  if (form === "column") {
    return "column";
  }
  if (form === "script") {
    return "script";
  }
  return "prose";
}

export function parseSeparatorKind(value: string): SceneSeparatorKind {
  const kind = value.trim().toLocaleLowerCase("pt-BR");
  if (kind === "asterism" || kind === "***" || kind === "stars") {
    return "asterism";
  }
  if (kind === "none" || kind === "blank" || kind === "") {
    return kind === "" ? "title" : "none";
  }
  if (kind === "title" || kind === "chapter") {
    return "title";
  }
  return "title";
}

export function joinScenes(
  scenes: SceneForOutput[],
  separator: SceneSeparatorKind
): string {
  const parts: string[] = [];
  for (let index = 0; index < scenes.length; index += 1) {
    if (index > 0) {
      if (separator === "asterism") {
        parts.push("\n\n* * *\n\n");
      } else if (separator === "none") {
        parts.push("\n\n");
      } else {
        parts.push("\n\n");
      }
    }
    const scene = scenes[index];
    const body = formatSceneBody(scene);
    if (separator === "title") {
      parts.push(`# ${scene.title}\n\n${body}`);
    } else {
      parts.push(body);
    }
  }
  return parts.join("");
}

/** Verse keeps line breaks. Prose becomes book paragraphs. Chronicle may lead with its date. */
export function formatSceneBody(scene: SceneForOutput): string {
  const body = noteBody(scene.text).replace(/\r\n/g, "\n").trim();
  if (scene.form === "verse") {
    return body;
  }
  if (scene.form === "chronicle" && scene.when.length > 0) {
    return `${scene.when}\n\n${proseParagraphs(body)}`;
  }
  if (scene.form === "script" || scene.form === "column") {
    return body;
  }
  return proseParagraphs(body);
}

function proseParagraphs(body: string): string {
  const blocks = body.split(/\n\s*\n/);
  const parts: string[] = [];
  for (const block of blocks) {
    const line = block
      .split(/\n/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" ");
    if (line.length > 0) {
      parts.push(line);
    }
  }
  return parts.join("\n\n");
}

export function bookOpeningMarkdown(opening: BookOpening, titles: string[]): string {
  const parts: string[] = [];
  parts.push(`# ${opening.title}`);
  if (opening.author.length > 0) {
    parts.push("");
    parts.push(opening.author);
  }
  parts.push("");
  parts.push("---");
  parts.push("");
  if (opening.dedication.length > 0) {
    parts.push(`*${opening.dedication}*`);
    parts.push("");
    parts.push("---");
    parts.push("");
  }
  if (opening.epigraph.length > 0) {
    parts.push(`> ${opening.epigraph.split(/\n/).join("\n> ")}`);
    if (opening.epigraphSource.length > 0) {
      parts.push(">");
      parts.push(`> — ${opening.epigraphSource}`);
    }
    parts.push("");
    parts.push("---");
    parts.push("");
  }
  if (titles.length > 0) {
    parts.push("## Contents");
    parts.push("");
    for (const title of titles) {
      parts.push(`- ${title}`);
    }
    parts.push("");
    parts.push("---");
    parts.push("");
  }
  return parts.join("\n");
}

export function toPlainText(markdown: string): string {
  return noteBody(markdown)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\r\n/g, "\n")
    .trim() + "\n";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toHtml(
  markdown: string,
  options: { title: string; doubleSpace?: boolean; formAware?: boolean } = {
    title: "Manuscript",
  }
): string {
  const body = noteBody(markdown).replace(/\r\n/g, "\n");
  const blocks = body.split(/\n\s*\n/);
  const parts: string[] = [];
  for (const block of blocks) {
    const lines = block.split(/\n/);
    const first = lines[0] ?? "";
    if (/^#\s+/.test(first) && lines.length === 1) {
      parts.push(`<h1>${escapeHtml(first.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^##\s+/.test(first) && lines.length === 1) {
      parts.push(`<h2>${escapeHtml(first.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (first.trim() === "---") {
      parts.push('<hr class="longform-break"/>');
      continue;
    }
    if (first.trim() === "* * *") {
      parts.push('<p class="longform-asterism">* * *</p>');
      continue;
    }
    if (lines.every((line) => /^>\s?/.test(line) || line.trim().length === 0)) {
      const quote = lines
        .map((line) => escapeHtml(line.replace(/^>\s?/, "")))
        .join("<br/>");
      parts.push(`<blockquote>${quote}</blockquote>`);
      continue;
    }
    if (lines.length > 1 && lines.every((line) => line.trim().length > 0)) {
      parts.push(
        `<pre class="longform-verse">${lines.map((line) => escapeHtml(line)).join("\n")}</pre>`
      );
      continue;
    }
    const text = lines.map((line) => line.trim()).filter((line) => line.length > 0).join(" ");
    if (text.length > 0) {
      parts.push(`<p>${escapeHtml(text)}</p>`);
    }
  }
  const space = options.doubleSpace ? "line-height:2;" : "line-height:1.5;";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A5; margin: 2cm; }
  body { font-family: "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; ${space} max-width: 36rem; margin: 0 auto; padding: 2rem; color: #111; background: #fff; }
  h1, h2 { page-break-after: avoid; font-weight: normal; }
  h1 { font-size: 1.6rem; margin: 2.5rem 0 1rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 0.8rem; }
  p { margin: 0 0 0.9rem; text-align: justify; hyphens: auto; }
  .longform-verse { font-family: inherit; white-space: pre-wrap; text-align: left; background: none; border: 0; padding: 0; margin: 0 0 1.2rem; page-break-inside: avoid; }
  .longform-asterism { text-align: center; letter-spacing: 0.4em; }
  blockquote { font-style: italic; margin: 1.5rem 2rem; }
  hr.longform-break { border: 0; border-top: 1px solid #ccc; margin: 2rem 0; }
  .longform-page { box-sizing: border-box; width: 14cm; min-height: 20cm; margin: 1rem auto; padding: 2cm 1.8cm; border: 1px solid #ddd; background: #fff; page-break-after: always; }
  .longform-page-number { text-align: center; color: #666; font-size: 0.85rem; margin-top: 1.5rem; }
</style>
</head>
<body>
${parts.join("\n")}
</body>
</html>
`;
}

/** Rough print pages: verse keeps its lines; prose wraps to a measure. */
export function printPages(
  markdown: string,
  options: { linesPerPage?: number; charsPerLine?: number } = {}
): PrintPage[] {
  const linesPerPage = options.linesPerPage ?? 28;
  const charsPerLine = options.charsPerLine ?? 60;
  const body = noteBody(markdown).replace(/\r\n/g, "\n");
  const lines: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const raw = block.split(/\n/);
    if (raw.length > 1 && raw.every((line) => line.trim().length > 0) && !/^#/.test(raw[0])) {
      for (const line of raw) {
        lines.push(line);
      }
      lines.push("");
      continue;
    }
    const joined = raw.map((line) => line.trim()).filter((line) => line.length > 0).join(" ");
    if (joined.length === 0) {
      lines.push("");
      continue;
    }
    if (/^#{1,6}\s+/.test(joined) || joined === "* * *" || joined === "---") {
      lines.push(joined);
      lines.push("");
      continue;
    }
    let rest = joined;
    while (rest.length > charsPerLine) {
      let cut = rest.lastIndexOf(" ", charsPerLine);
      if (cut < charsPerLine / 2) {
        cut = charsPerLine;
      }
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    if (rest.length > 0) {
      lines.push(rest);
    }
    lines.push("");
  }
  const pages: PrintPage[] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    const slice = lines.slice(index, index + linesPerPage);
    const number = pages.length + 1;
    pages.push({
      number,
      html: `<section class="longform-page"><div class="longform-page-body">${slice
        .map((line) => escapeHtml(line) || "&nbsp;")
        .join("<br/>")}</div><div class="longform-page-number">${number}</div></section>`,
    });
  }
  if (pages.length === 0) {
    pages.push({
      number: 1,
      html: `<section class="longform-page"><div class="longform-page-body">&nbsp;</div><div class="longform-page-number">1</div></section>`,
    });
  }
  return pages;
}

export function printPreviewHtml(title: string, markdown: string): string {
  const pages = printPages(markdown);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)} — print</title>
<style>
  body { margin: 0; background: #e8e4dc; font-family: "Palatino Linotype", Palatino, Georgia, serif; }
  .longform-page { box-sizing: border-box; width: 14cm; min-height: 20cm; margin: 1.2rem auto; padding: 2cm 1.8cm 1.2cm; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
  .longform-page-body { white-space: pre-wrap; line-height: 1.45; font-size: 12pt; }
  .longform-page-number { text-align: center; color: #666; font-size: 10pt; margin-top: 1.2rem; }
  @media print {
    body { background: #fff; }
    .longform-page { box-shadow: none; margin: 0; page-break-after: always; width: auto; min-height: auto; }
  }
</style>
</head>
<body>
${pages.map((page) => page.html).join("\n")}
</body>
</html>
`;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipStoreFiles(files: { path: string; data: string | Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = utf8(file.path);
    const data = typeof file.data === "string" ? utf8(file.data) : file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat(locals.concat([centralDir, end]));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toDocx(markdown: string): Uint8Array {
  const plain = toPlainText(markdown).replace(/\r\n/g, "\n").trim();
  const paragraphs = plain.split(/\n\s*\n/);
  const body: string[] = [];
  for (const paragraph of paragraphs) {
    const lines = paragraph.split(/\n/);
    if (lines.length > 1) {
      body.push(
        `<w:p>${lines
          .map(
            (line, index) =>
              `<w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>${
                index < lines.length - 1 ? "<w:r><w:br/></w:r>" : ""
              }`
          )
          .join("")}</w:p>`
      );
    } else {
      body.push(
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`
      );
    }
  }
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body.join("\n    ")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
  return zipStoreFiles([
    {
      path: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      path: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { path: "word/document.xml", data: documentXml },
  ]);
}

/** A simple multi-page PDF of the manuscript text. */
export function toPdf(markdown: string, title: string): Uint8Array {
  const lines: string[] = [];
  for (const line of toPlainText(markdown).replace(/\r\n/g, "\n").split(/\n/)) {
    const text = line.length > 90 ? line.slice(0, 90) : line;
    lines.push(pdfEscape(text));
  }
  if (lines.length === 0) {
    lines.push("");
  }
  const linesPerPage = 45;
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids: string[] = [];
  for (let page = 0; page < pageCount; page += 1) {
    kids.push(`${3 + page * 2} 0 R`);
  }
  objects.push(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);
  for (let page = 0; page < pageCount; page += 1) {
    const contentId = 4 + page * 2;
    const pageId = 3 + page * 2;
    void pageId;
    const slice = lines.slice(page * linesPerPage, (page + 1) * linesPerPage);
    let y = 800;
    const commands = ["BT", "/F1 11 Tf", "14 TL", "72 800 Td"];
    for (let index = 0; index < slice.length; index += 1) {
      if (index === 0 && page === 0 && title.length > 0) {
        commands.push(`(${pdfEscape(title)}) Tj`, "T*", "T*");
        y -= 28;
      }
      commands.push(`(${slice[index]}) Tj`, "T*");
      y -= 14;
      void y;
    }
    commands.push("ET");
    const stream = commands.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const startxref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    const offset = String(offsets[index]);
    const padded = "0000000000".slice(offset.length) + offset;
    pdf += `${padded} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return utf8(pdf);
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function extensionFor(format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return "md";
    case "text":
      return "txt";
    case "html":
      return "html";
    case "epub":
      return "epub";
    case "docx":
      return "docx";
    case "pdf":
      return "pdf";
  }
}

/** Pull paragraph text out of a minimal DOCX package. */
export function paragraphsFromDocx(bytes: Uint8Array): string[] {
  const xml = findZipText(bytes, "word/document.xml");
  if (!xml) {
    return [];
  }
  const paragraphs: string[] = [];
  const blocks = xml.split(/<w:p[\s>]/);
  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    const end = block.indexOf("</w:p>");
    const slice = end >= 0 ? block.slice(0, end) : block;
    const texts: string[] = [];
    const pattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(slice))) {
      texts.push(decodeXml(match[1]));
    }
    if (/<w:br\b/.test(slice) && texts.length > 0) {
      paragraphs.push(texts.join("\n"));
    } else if (texts.length > 0) {
      paragraphs.push(texts.join(""));
    }
  }
  return paragraphs;
}

export function markdownFromDocx(bytes: Uint8Array): string {
  return paragraphsFromDocx(bytes).join("\n\n") + "\n";
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function findZipText(bytes: Uint8Array, path: string): string | null {
  const name = utf8(path);
  let index = 0;
  while (index + 30 < bytes.length) {
    if (
      bytes[index] !== 0x50 ||
      bytes[index + 1] !== 0x4b ||
      bytes[index + 2] !== 0x03 ||
      bytes[index + 3] !== 0x04
    ) {
      index += 1;
      continue;
    }
    const method = bytes[index + 8] | (bytes[index + 9] << 8);
    const compSize =
      bytes[index + 18] |
      (bytes[index + 19] << 8) |
      (bytes[index + 20] << 16) |
      (bytes[index + 21] << 24);
    const nameLen = bytes[index + 26] | (bytes[index + 27] << 8);
    const extraLen = bytes[index + 28] | (bytes[index + 29] << 8);
    const nameStart = index + 30;
    const dataStart = nameStart + nameLen + extraLen;
    let same = name.length === nameLen;
    if (same) {
      for (let at = 0; at < nameLen; at += 1) {
        if (bytes[nameStart + at] !== name[at]) {
          same = false;
          break;
        }
      }
    }
    if (same) {
      if (method !== 0) {
        return null;
      }
      return new TextDecoder().decode(bytes.slice(dataStart, dataStart + compSize));
    }
    index = dataStart + compSize;
  }
  return null;
}

export type ImportedScene = {
  title: string;
  text: string;
};

/** Binder titles and file references from a Scrivener .scrivx XML string. */
export function scenesFromScrivx(xml: string, texts: Record<string, string>): ImportedScene[] {
  const scenes: ImportedScene[] = [];
  const binder = /<BinderItem\b[^>]*UUID="([^"]+)"[^>]*Type="Text"[^>]*>[\s\S]*?<Title>([^<]*)<\/Title>/g;
  let match: RegExpExecArray | null;
  while ((match = binder.exec(xml))) {
    const uuid = match[1];
    const title = decodeXml(match[2]).trim() || "Untitled";
    const text = texts[uuid] ?? texts[`${uuid}/content`] ?? "";
    scenes.push({ title, text: text.length > 0 ? text : `# ${title}\n\n` });
  }
  if (scenes.length === 0) {
    const loose = /<Title>([^<]+)<\/Title>/g;
    const seen = new Set<string>();
    while ((match = loose.exec(xml))) {
      const title = decodeXml(match[1]).trim();
      if (title.length === 0 || seen.has(title) || title === "Draft" || title === "Research") {
        continue;
      }
      seen.add(title);
      scenes.push({ title, text: `# ${title}\n\n` });
    }
  }
  return scenes;
}

export function scenesFromMarkdownFiles(
  files: { name: string; text: string }[]
): ImportedScene[] {
  const scenes: ImportedScene[] = [];
  for (const file of files) {
    const title = file.name.replace(/\.md$/i, "");
    scenes.push({ title, text: file.text });
  }
  return scenes;
}

export const PUBLISHER_WORKFLOW = "Publisher Manuscript";
export const READING_WORKFLOW = "Reading Book";

export function professionalWorkflows(): Record<
  string,
  {
    name: string;
    description: string;
    steps: { id: string; optionValues: { [id: string]: unknown } }[];
  }
> {
  return {
    [PUBLISHER_WORKFLOW]: {
      name: PUBLISHER_WORKFLOW,
      description:
        "Title page and double-spaced manuscript for a publisher. Scenes become chapters.",
      steps: [
        { id: "strip-frontmatter", optionValues: {} },
        {
          id: "remove-links",
          optionValues: { "remove-wikilinks": true, "remove-external-links": true },
        },
        { id: "remove-comments", optionValues: {} },
        { id: "remove-strikethroughs", optionValues: {} },
        {
          id: "join-scenes",
          optionValues: { separator: "title" },
        },
        {
          id: "add-book-opening",
          optionValues: { contents: true, dedication: true, epigraph: true },
        },
        {
          id: "export-file",
          optionValues: {
            format: "docx",
            target: "Output/$1-publisher.docx",
            "open-after": false,
            "double-space": true,
          },
        },
      ],
    },
    [READING_WORKFLOW]: {
      name: READING_WORKFLOW,
      description:
        "A book to read: opening pages, asterisms between scenes, and an HTML page with verse kept intact.",
      steps: [
        { id: "strip-frontmatter", optionValues: {} },
        {
          id: "remove-links",
          optionValues: { "remove-wikilinks": true, "remove-external-links": true },
        },
        { id: "remove-comments", optionValues: {} },
        {
          id: "join-scenes",
          optionValues: { separator: "asterism" },
        },
        {
          id: "add-book-opening",
          optionValues: { contents: true, dedication: true, epigraph: true },
        },
        {
          id: "export-file",
          optionValues: {
            format: "html",
            target: "Output/$1-book.html",
            "open-after": true,
            "double-space": false,
          },
        },
      ],
    },
  };
}
