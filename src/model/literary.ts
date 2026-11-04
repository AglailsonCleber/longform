export const VENUE_KINDS = [
  "magazine",
  "contest",
  "publisher",
  "agent",
  "column",
] as const;

export type VenueKind = (typeof VENUE_KINDS)[number];

export const SUBMISSION_STATUSES = [
  "prepared",
  "sent",
  "reading",
  "accepted",
  "refused",
  "published",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type Venue = {
  id: string;
  name: string;
  kind: VenueKind;
  /** False means the venue expects an exclusive submission. */
  simultaneous: boolean;
  exclusivityDays: number;
  notes: string;
};

export type Rights = {
  first: boolean;
  exclusiveUntil: string;
  republishFrom: string;
};

export type ContestInfo = {
  deadline: string;
  fee: string;
  rules: string;
};

export type Submission = {
  id: string;
  project: string;
  piecePath: string;
  pieceTitle: string;
  venueId: string;
  status: SubmissionStatus;
  preparedAt: number;
  sentAt: number;
  decidedAt: number;
  /** Relative path under the plugin folder for the frozen copy. */
  frozenPath: string;
  rights: Rights;
  contest: ContestInfo;
  publishedUrl: string;
};

export type Contract = {
  id: string;
  project: string;
  piecePath: string;
  pieceTitle: string;
  with: string;
  amount: string;
  when: string;
  note: string;
};

export type Edition = {
  id: string;
  project: string;
  title: string;
  coverPath: string;
  bodyPaths: string[];
  epubPath: string;
  at: number;
};

export const EMPTY_RIGHTS: Rights = {
  first: false,
  exclusiveUntil: "",
  republishFrom: "",
};

export const EMPTY_CONTEST: ContestInfo = {
  deadline: "",
  fee: "",
  rules: "",
};

export function newVenueId(at = Date.now()): string {
  return `venue-${at}`;
}

export function newSubmissionId(at = Date.now()): string {
  return `sub-${at}`;
}

export function newContractId(at = Date.now()): string {
  return `contract-${at}`;
}

export function newEditionId(at = Date.now()): string {
  return `edition-${at}`;
}

export function venueById(venues: Venue[], id: string): Venue | null {
  for (const venue of venues) {
    if (venue.id === id) {
      return venue;
    }
  }
  return null;
}

const OPEN: SubmissionStatus[] = ["sent", "reading", "accepted"];

function isOpen(status: SubmissionStatus): boolean {
  return OPEN.indexOf(status) >= 0;
}

/**
 * An exclusive venue conflicts when the same piece is already out elsewhere
 * in an open status. A simultaneous venue still conflicts with an exclusive
 * venue that already holds the piece.
 */
export function simultaneousConflict(
  venues: Venue[],
  submissions: Submission[],
  piecePath: string,
  venueId: string,
  ignoreId = ""
): string {
  const target = venueById(venues, venueId);
  if (!target) {
    return "";
  }
  for (const submission of submissions) {
    if (submission.id === ignoreId || submission.piecePath !== piecePath) {
      continue;
    }
    if (!isOpen(submission.status)) {
      continue;
    }
    const other = venueById(venues, submission.venueId);
    if (!other) {
      continue;
    }
    if (!target.simultaneous || !other.simultaneous) {
      return `${other.name} already holds this piece.`;
    }
  }
  return "";
}

export function rightsBlock(
  submissions: Submission[],
  piecePath: string,
  today: string
): string {
  for (const submission of submissions) {
    if (submission.piecePath !== piecePath) {
      continue;
    }
    if (submission.status !== "accepted" && submission.status !== "published") {
      continue;
    }
    const until = submission.rights.exclusiveUntil.trim();
    if (until.length > 0 && until >= today) {
      return `Exclusive until ${until}.`;
    }
    if (submission.rights.first && submission.rights.republishFrom.trim().length === 0) {
      return "First publication is still reserved.";
    }
    const from = submission.rights.republishFrom.trim();
    if (from.length > 0 && from > today) {
      return `Republication opens on ${from}.`;
    }
  }
  return "";
}

export function prepareSubmission(
  submissions: Submission[],
  next: Omit<Submission, "status" | "sentAt" | "decidedAt" | "frozenPath" | "publishedUrl"> & {
    frozenPath?: string;
    publishedUrl?: string;
  }
): Submission[] {
  const submission: Submission = {
    ...next,
    status: "prepared",
    sentAt: 0,
    decidedAt: 0,
    frozenPath: next.frozenPath ?? "",
    publishedUrl: next.publishedUrl ?? "",
    rights: { ...EMPTY_RIGHTS, ...next.rights },
    contest: { ...EMPTY_CONTEST, ...next.contest },
  };
  return submissions.concat(submission);
}

export function setSubmissionStatus(
  submissions: Submission[],
  id: string,
  status: SubmissionStatus,
  at = Date.now()
): Submission[] {
  return submissions.map((submission) => {
    if (submission.id !== id) {
      return submission;
    }
    const next = { ...submission, status };
    if (status === "sent" && submission.sentAt === 0) {
      next.sentAt = at;
    }
    if (
      (status === "accepted" || status === "refused" || status === "published") &&
      submission.decidedAt === 0
    ) {
      next.decidedAt = at;
    }
    if (status === "published" && submission.rights.first === false) {
      next.rights = { ...submission.rights, first: true };
    }
    return next;
  });
}

export function freezeSubmission(
  submissions: Submission[],
  id: string,
  frozenPath: string,
  at = Date.now()
): Submission[] {
  return submissions.map((submission) => {
    if (submission.id !== id) {
      return submission;
    }
    return {
      ...submission,
      frozenPath,
      status: submission.status === "prepared" ? "sent" : submission.status,
      sentAt: submission.sentAt === 0 ? at : submission.sentAt,
    };
  });
}

export function setPublishedUrl(
  submissions: Submission[],
  id: string,
  url: string
): Submission[] {
  return submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          publishedUrl: url.trim(),
          status: url.trim().length > 0 ? "published" : submission.status,
          rights:
            url.trim().length > 0
              ? { ...submission.rights, first: true }
              : submission.rights,
        }
      : submission
  );
}

export function setSubmissionRights(
  submissions: Submission[],
  id: string,
  rights: Rights
): Submission[] {
  return submissions.map((submission) =>
    submission.id === id ? { ...submission, rights: { ...rights } } : submission
  );
}

export function setSubmissionContest(
  submissions: Submission[],
  id: string,
  contest: ContestInfo
): Submission[] {
  return submissions.map((submission) =>
    submission.id === id ? { ...submission, contest: { ...contest } } : submission
  );
}

export function submissionsForProject(
  submissions: Submission[],
  project: string
): Submission[] {
  const found: Submission[] = [];
  for (const submission of submissions) {
    if (submission.project === project) {
      found.push(submission);
    }
  }
  found.sort((left, right) => right.preparedAt - left.preparedAt);
  return found;
}

export function submissionsForPiece(
  submissions: Submission[],
  piecePath: string
): Submission[] {
  const found: Submission[] = [];
  for (const submission of submissions) {
    if (submission.piecePath === piecePath) {
      found.push(submission);
    }
  }
  return found;
}

export function upcomingDeadlines(
  submissions: Submission[],
  today: string
): Submission[] {
  const found: Submission[] = [];
  for (const submission of submissions) {
    const deadline = submission.contest.deadline.trim();
    if (deadline.length === 0) {
      continue;
    }
    if (
      submission.status === "refused" ||
      submission.status === "published" ||
      submission.status === "accepted"
    ) {
      continue;
    }
    if (deadline >= today) {
      found.push(submission);
    }
  }
  found.sort((left, right) =>
    left.contest.deadline < right.contest.deadline
      ? -1
      : left.contest.deadline > right.contest.deadline
        ? 1
        : 0
  );
  return found;
}

export function overdueDeadlines(
  submissions: Submission[],
  today: string
): Submission[] {
  const found: Submission[] = [];
  for (const submission of submissions) {
    const deadline = submission.contest.deadline.trim();
    if (deadline.length === 0) {
      continue;
    }
    if (
      submission.status === "refused" ||
      submission.status === "published" ||
      submission.status === "accepted" ||
      submission.status === "sent" ||
      submission.status === "reading"
    ) {
      continue;
    }
    if (deadline < today) {
      found.push(submission);
    }
  }
  return found;
}

export function renameLiteraryPath<T extends { piecePath?: string; path?: string }>(
  items: T[],
  from: string,
  to: string
): T[] {
  return items.map((item) => {
    if (item.piecePath === from) {
      return { ...item, piecePath: to };
    }
    if ((item as { path?: string }).path === from) {
      return { ...item, path: to };
    }
    return item;
  });
}

export function stableLinkNote(title: string, url: string, venue: string): string {
  const lines = [
    `# ${title}`,
    "",
    url.trim().length > 0 ? url.trim() : "(no address yet)",
    "",
  ];
  if (venue.trim().length > 0) {
    lines.push(`Published at ${venue.trim()}.`);
    lines.push("");
  }
  lines.push("This address does not depend on a social feed.");
  lines.push("");
  return lines.join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function proseToXhtml(text: string): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const blocks = body.split(/\n\s*\n/);
  const parts: string[] = [];
  for (const block of blocks) {
    const lines = block.split(/\n/);
    const cleaned: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        cleaned.push(escapeXml(trimmed));
      }
    }
    if (cleaned.length === 0) {
      continue;
    }
    if (cleaned.length === 1) {
      parts.push(`<p>${cleaned[0]}</p>`);
    } else {
      parts.push(`<p>${cleaned.join("<br/>")}</p>`);
    }
  }
  return parts.join("\n");
}

export type EpubPart = {
  title: string;
  text: string;
};

export type EpubFile = {
  path: string;
  data: string | Uint8Array;
};

/** Build the files of a minimal EPUB. Cover is optional and stays separate from the body. */
export function epubFiles(
  title: string,
  author: string,
  parts: EpubPart[],
  cover?: { path: string; mediaType: string; bytes: Uint8Array }
): EpubFile[] {
  const files: EpubFile[] = [
    { path: "mimetype", data: "application/epub+zip" },
    {
      path: "META-INF/container.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`,
    },
  ];

  const manifest: string[] = [];
  const spine: string[] = [];
  const nav: string[] = [];

  if (cover) {
    const name = cover.path.indexOf("/") >= 0 ? cover.path.split("/").pop() ?? "cover.jpg" : cover.path;
    files.push({ path: `OEBPS/${name}`, data: cover.bytes });
    manifest.push(
      `    <item id="cover-image" href="${escapeXml(name)}" media-type="${escapeXml(cover.mediaType)}" properties="cover-image"/>`
    );
    files.push({
      path: "OEBPS/cover.xhtml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><meta charset="utf-8"/></head>
<body style="text-align:center;margin:0;padding:0;">
  <img src="${escapeXml(name)}" alt="Cover" style="max-width:100%;"/>
</body>
</html>
`,
    });
    manifest.push(`    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
    spine.push(`    <itemref idref="cover"/>`);
    nav.push(`      <li><a href="cover.xhtml">Cover</a></li>`);
  }

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const href = `chapter-${index + 1}.xhtml`;
    const id = `chap-${index + 1}`;
    files.push({
      path: `OEBPS/${href}`,
      data: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">
<head><title>${escapeXml(part.title)}</title><meta charset="utf-8"/></head>
<body>
<h1>${escapeXml(part.title)}</h1>
${proseToXhtml(part.text)}
</body>
</html>
`,
    });
    manifest.push(
      `    <item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`
    );
    spine.push(`    <itemref idref="${id}"/>`);
    nav.push(`      <li><a href="${href}">${escapeXml(part.title)}</a></li>`);
  }

  files.push({
    path: "OEBPS/nav.xhtml",
    data: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title><meta charset="utf-8"/></head>
<body>
<nav epub:type="toc"><ol>
${nav.join("\n")}
</ol></nav>
</body>
</html>
`,
  });
  manifest.push(
    `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`
  );

  files.push({
    path: "OEBPS/content.opf",
    data: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">longform-${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>pt-BR</dc:language>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
${manifest.join("\n")}
  </manifest>
  <spine>
${spine.join("\n")}
  </spine>
</package>
`,
  });

  return files;
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

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/** Store-only ZIP. The mimetype entry must stay first and uncompressed for EPUB. */
export function zipStore(files: EpubFile[]): Uint8Array {
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

export function todayStamp(date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}
