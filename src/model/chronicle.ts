import { CEILING_KEY, WRITTEN_KEY } from "./architecture";
import { PLACE_KEY, WHEN_KEY } from "./bible";

export const CADENCE_KEY = "longform-column-cadence";
export const CEILING_UNIT_KEY = "longform-ceiling-unit";
export const DUE_KEY = "longform-due";
export const PERSONA_KEY = "longform-persona";
export const FACT_SEEN_KEY = "longform-fact-seen";
export const FACT_INVENTED_KEY = "longform-fact-invented";
export const PAPER_VERSION_KEY = "longform-paper-version";
export const BOOK_VERSION_KEY = "longform-book-version";
export const VENUE_KEY = "longform-venue";
export const DESK_KEY = "longform-desk";
export const PUBLISHED_KEY = "longform-published";
export const REAL_PEOPLE_KEY = "longform-real-people";
export const NARRATOR_KEY = "longform-narrator";
export const FIRST_PUBLISHED_KEY = "longform-first-published";
export const FIRST_VENUE_KEY = "longform-first-venue";
export const COLUMN_SERIES_KEY = "longform-column-series";

export const CADENCES = ["weekly", "biweekly", "once"] as const;
export type Cadence = (typeof CADENCES)[number];

export const CEILING_UNITS = ["words", "chars", "pages"] as const;
export type CeilingUnit = (typeof CEILING_UNITS)[number];

export type Persona = {
  tone: string;
  address: string;
  notices: string;
};

export type FactSheet = {
  date: string;
  place: string;
  seen: string;
  invented: string;
};

export type ChronicleSheet = {
  cadence: Cadence | "";
  ceiling: number;
  ceilingUnit: CeilingUnit;
  due: string;
  persona: Persona;
  fact: FactSheet;
  paperVersion: string;
  bookVersion: string;
  venue: string;
  desk: string;
  published: string;
  realPeople: string[];
  narrator: string;
  firstPublished: string;
  firstVenue: string;
  series: string;
  written: string;
};

export type ColumnSlot = {
  stamp: string;
  path: string;
  title: string;
  filled: boolean;
};

export type CeilingCheck = {
  current: number;
  ceiling: number;
  unit: CeilingUnit;
  over: boolean;
};

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOf(value: unknown): number {
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") {
    const parts: string[] = [];
    for (const part of value.split(/[\n,]/)) {
      const item = part.trim();
      if (item.length > 0) {
        parts.push(item);
      }
    }
    return parts;
  }
  if (value instanceof Array) {
    const parts: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && item.trim().length > 0) {
        parts.push(item.trim());
      }
    }
    return parts;
  }
  return [];
}

function recordOf(frontmatter: unknown): Record<string, unknown> {
  if (!frontmatter || typeof frontmatter !== "object") {
    return {};
  }
  return frontmatter as Record<string, unknown>;
}

function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function parseCadence(value: unknown): Cadence | "" {
  const text = textOf(value).toLocaleLowerCase("pt-BR");
  if (text === "weekly" || text === "semanal") {
    return "weekly";
  }
  if (text === "biweekly" || text === "quinzenal") {
    return "biweekly";
  }
  if (text === "once" || text === "avulsa" || text === "avulso") {
    return "once";
  }
  return "";
}

export function parseCeilingUnit(value: unknown): CeilingUnit {
  const text = textOf(value).toLocaleLowerCase("pt-BR");
  if (text === "chars" || text === "caracteres" || text === "characters") {
    return "chars";
  }
  if (text === "pages" || text === "laudas" || text === "lauda") {
    return "pages";
  }
  return "words";
}

export function personaFrom(value: unknown): Persona {
  if (!value || typeof value !== "object") {
    return { tone: "", address: "", notices: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    tone: textOf(record.tone),
    address: textOf(record.address),
    notices: textOf(record.notices),
  };
}

export function chronicleFromFrontmatter(frontmatter: unknown): ChronicleSheet {
  const record = recordOf(frontmatter);
  return {
    cadence: parseCadence(record[CADENCE_KEY]),
    ceiling: numberOf(record[CEILING_KEY]),
    ceilingUnit: parseCeilingUnit(record[CEILING_UNIT_KEY]),
    due: textOf(record[DUE_KEY]),
    persona: personaFrom(record[PERSONA_KEY]),
    fact: {
      date: textOf(record[WHEN_KEY]),
      place: textOf(record[PLACE_KEY]),
      seen: textOf(record[FACT_SEEN_KEY]),
      invented: textOf(record[FACT_INVENTED_KEY]),
    },
    paperVersion: textOf(record[PAPER_VERSION_KEY]),
    bookVersion: textOf(record[BOOK_VERSION_KEY]),
    venue: textOf(record[VENUE_KEY]),
    desk: textOf(record[DESK_KEY]),
    published: textOf(record[PUBLISHED_KEY]),
    realPeople: stringsOf(record[REAL_PEOPLE_KEY]),
    narrator: textOf(record[NARRATOR_KEY]),
    firstPublished: textOf(record[FIRST_PUBLISHED_KEY]),
    firstVenue: textOf(record[FIRST_VENUE_KEY]),
    series: textOf(record[COLUMN_SERIES_KEY]),
    written: textOf(record[WRITTEN_KEY]),
  };
}

export function measureForCeiling(text: string, unit: CeilingUnit): number {
  const body = noteBody(text);
  if (unit === "chars") {
    return body.replace(/\s+/g, " ").trim().length;
  }
  if (unit === "pages") {
    const words = body.split(/\s+/).filter((part) => part.length > 0).length;
    return Math.max(1, Math.ceil(words / 180));
  }
  return body.split(/\s+/).filter((part) => part.length > 0).length;
}

export function ceilingCheck(
  text: string,
  sheet: ChronicleSheet
): CeilingCheck {
  const current = measureForCeiling(text, sheet.ceilingUnit);
  return {
    current,
    ceiling: sheet.ceiling,
    unit: sheet.ceilingUnit,
    over: sheet.ceiling > 0 && current > sheet.ceiling,
  };
}

function dayStamp(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? `0${month}` : month}-${
    day < 10 ? `0${day}` : day
  }`;
}

function addDays(stamp: string, days: number): string {
  const date = new Date(stamp + "T12:00:00");
  date.setDate(date.getDate() + days);
  return dayStamp(date);
}

/**
 * Column calendar for a series. Empty slots are holes the editor will notice
 * before anyone asks.
 */
export function columnCalendar(
  cadence: Cadence,
  start: string,
  count: number,
  pieces: { path: string; title: string; written: string; published: string }[]
): ColumnSlot[] {
  if (!cadence || cadence === "once" || !start || count <= 0) {
    return pieces.map((piece) => ({
      stamp: piece.published || piece.written || "",
      path: piece.path,
      title: piece.title,
      filled: true,
    }));
  }
  const step = cadence === "weekly" ? 7 : 14;
  const byDay = new Map<string, { path: string; title: string }>();
  for (const piece of pieces) {
    const stamp = piece.published || piece.written;
    if (stamp) {
      byDay.set(stamp, { path: piece.path, title: piece.title });
    }
  }
  const slots: ColumnSlot[] = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    const hit = byDay.get(cursor);
    slots.push({
      stamp: cursor,
      path: hit?.path ?? "",
      title: hit?.title ?? "",
      filled: Boolean(hit),
    });
    cursor = addDays(cursor, step);
  }
  return slots;
}

export function holesInCalendar(slots: ColumnSlot[]): ColumnSlot[] {
  const holes: ColumnSlot[] = [];
  for (const slot of slots) {
    if (!slot.filled) {
      holes.push(slot);
    }
  }
  return holes;
}

export function dueSoon(due: string, today: string, withinDays = 3): boolean {
  if (!due || !today) {
    return false;
  }
  const dueDate = new Date(due + "T12:00:00").getTime();
  const now = new Date(today + "T12:00:00").getTime();
  if (Number.isNaN(dueDate) || Number.isNaN(now)) {
    return false;
  }
  const diff = Math.round((dueDate - now) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff <= withinDays;
}

export function linkVersions(
  frontmatter: Record<string, unknown>,
  paperPath: string,
  bookPath: string
): void {
  if (paperPath.trim()) {
    frontmatter[PAPER_VERSION_KEY] = paperPath.trim();
  } else {
    delete frontmatter[PAPER_VERSION_KEY];
  }
  if (bookPath.trim()) {
    frontmatter[BOOK_VERSION_KEY] = bookPath.trim();
  } else {
    delete frontmatter[BOOK_VERSION_KEY];
  }
}

export function preserveFirstPublication(
  frontmatter: Record<string, unknown>,
  published: string,
  venue: string
): void {
  const existingDate = textOf(frontmatter[FIRST_PUBLISHED_KEY]);
  const existingVenue = textOf(frontmatter[FIRST_VENUE_KEY]);
  if (!existingDate && published.trim()) {
    frontmatter[FIRST_PUBLISHED_KEY] = published.trim();
  }
  if (!existingVenue && venue.trim()) {
    frontmatter[FIRST_VENUE_KEY] = venue.trim();
  }
  if (published.trim()) {
    frontmatter[PUBLISHED_KEY] = published.trim();
  }
  if (venue.trim()) {
    frontmatter[VENUE_KEY] = venue.trim();
  }
}

export function assignPersona(
  frontmatter: Record<string, unknown>,
  persona: Persona
): void {
  if (!persona.tone && !persona.address && !persona.notices) {
    delete frontmatter[PERSONA_KEY];
    return;
  }
  frontmatter[PERSONA_KEY] = {
    tone: persona.tone,
    address: persona.address,
    notices: persona.notices,
  };
}

export function assignFact(
  frontmatter: Record<string, unknown>,
  fact: FactSheet
): void {
  if (fact.date) {
    frontmatter[WHEN_KEY] = fact.date;
  } else {
    delete frontmatter[WHEN_KEY];
  }
  if (fact.place) {
    frontmatter[PLACE_KEY] = fact.place;
  } else {
    delete frontmatter[PLACE_KEY];
  }
  if (fact.seen) {
    frontmatter[FACT_SEEN_KEY] = fact.seen;
  } else {
    delete frontmatter[FACT_SEEN_KEY];
  }
  if (fact.invented) {
    frontmatter[FACT_INVENTED_KEY] = fact.invented;
  } else {
    delete frontmatter[FACT_INVENTED_KEY];
  }
}

export function assignVehicleCeiling(
  frontmatter: Record<string, unknown>,
  amount: number,
  unit: CeilingUnit
): void {
  if (amount > 0) {
    frontmatter[CEILING_KEY] = Math.floor(amount);
    frontmatter[CEILING_UNIT_KEY] = unit;
  } else {
    delete frontmatter[CEILING_KEY];
    delete frontmatter[CEILING_UNIT_KEY];
  }
}

export type VenueFilter = {
  venue: string;
  desk: string;
  published: string;
};

export type ChroniclePiece = ChronicleSheet & { path: string; title: string };

export function filterByVenue(
  pieces: ChroniclePiece[],
  filter: VenueFilter
): ChroniclePiece[] {
  const found: ChroniclePiece[] = [];
  for (const piece of pieces) {
    if (
      filter.venue &&
      piece.venue.toLocaleLowerCase("pt-BR") !==
        filter.venue.toLocaleLowerCase("pt-BR")
    ) {
      continue;
    }
    if (
      filter.desk &&
      piece.desk.toLocaleLowerCase("pt-BR") !==
        filter.desk.toLocaleLowerCase("pt-BR")
    ) {
      continue;
    }
    if (filter.published && !piece.published.startsWith(filter.published)) {
      continue;
    }
    found.push(piece);
  }
  return found;
}

/** Names marked as real people for a careful reading before sending. */
export function realPeopleMarks(frontmatter: unknown): string[] {
  return stringsOf(recordOf(frontmatter)[REAL_PEOPLE_KEY]);
}

export function setRealPeople(
  frontmatter: Record<string, unknown>,
  names: string[]
): void {
  if (names.length > 0) {
    frontmatter[REAL_PEOPLE_KEY] = names;
  } else {
    delete frontmatter[REAL_PEOPLE_KEY];
  }
}
