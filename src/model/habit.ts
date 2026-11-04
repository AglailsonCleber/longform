export const GOAL_AMOUNT_KEY = "longform-goal-amount";
export const GOAL_UNIT_KEY = "longform-goal-unit";
export const GOAL_DUE_KEY = "longform-goal-due";

export const SESSION_UNITS = ["words", "minutes", "lines", "stanzas"] as const;
export type SessionUnit = (typeof SESSION_UNITS)[number];

export const PROJECT_UNITS = ["words", "lines", "stanzas", "chapters"] as const;
export type ProjectUnit = (typeof PROJECT_UNITS)[number];

export type ProjectGoal = {
  amount: number;
  unit: ProjectUnit;
  due: string;
};

export type Sprint = {
  startedAt: number;
  endsAt: number;
  seconds: number;
};

export type DayMark = {
  day: string;
  words: number;
};

function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function dayStamp(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? `0${month}` : month}-${
    day < 10 ? `0${day}` : day
  }`;
}

export function parseSessionUnit(value: unknown): SessionUnit {
  const unit = textOf(value).toLocaleLowerCase("pt-BR");
  if (unit === "minutes" || unit === "minutos" || unit === "minute") {
    return "minutes";
  }
  if (unit === "lines" || unit === "linhas" || unit === "line") {
    return "lines";
  }
  if (unit === "stanzas" || unit === "estrofes" || unit === "stanza") {
    return "stanzas";
  }
  return "words";
}

export function parseProjectUnit(value: unknown): ProjectUnit {
  const unit = textOf(value).toLocaleLowerCase("pt-BR");
  if (unit === "lines" || unit === "linhas") {
    return "lines";
  }
  if (unit === "stanzas" || unit === "estrofes") {
    return "stanzas";
  }
  if (unit === "chapters" || unit === "capítulos" || unit === "capitulos") {
    return "chapters";
  }
  return "words";
}

export function projectGoalFromFrontmatter(frontmatter: unknown): ProjectGoal | null {
  if (!frontmatter || typeof frontmatter !== "object") {
    return null;
  }
  const record = frontmatter as Record<string, unknown>;
  const amount = Number(record[GOAL_AMOUNT_KEY]);
  if (!amount || amount <= 0) {
    return null;
  }
  return {
    amount,
    unit: parseProjectUnit(record[GOAL_UNIT_KEY]),
    due: textOf(record[GOAL_DUE_KEY]),
  };
}

/** Lines of body text, excluding a trailing empty line. */
export function countLines(text: string): number {
  const body = noteBody(text).replace(/\r\n/g, "\n").replace(/\s+$/, "");
  if (body.length === 0) {
    return 0;
  }
  return body.split(/\n/).length;
}

/** Stanzas are blocks separated by a blank line. */
export function countStanzas(text: string): number {
  const body = noteBody(text).replace(/\r\n/g, "\n").trim();
  if (body.length === 0) {
    return 0;
  }
  const blocks = body.split(/\n\s*\n/);
  let count = 0;
  for (const block of blocks) {
    if (block.trim().length > 0) {
      count += 1;
    }
  }
  return count;
}

export function countWordsSimple(text: string): number {
  const body = noteBody(text);
  const words: string[] = [];
  for (const part of body.split(/\s+/)) {
    if (part.length > 0) {
      words.push(part);
    }
  }
  return words.length;
}

/** Reading time for the reader, not the author's session production. */
export function readingMinutes(words: number, wordsPerMinute = 200): number {
  if (words <= 0 || wordsPerMinute <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function sessionProgress(
  produced: number,
  goal: number
): { ratio: number; reached: boolean } {
  if (goal <= 0) {
    return { ratio: 0, reached: false };
  }
  const ratio = produced / goal;
  return { ratio, reached: ratio >= 1 };
}

export function projectProgress(
  current: number,
  goal: ProjectGoal
): { ratio: number; remaining: number } {
  if (goal.amount <= 0) {
    return { ratio: 0, remaining: 0 };
  }
  const ratio = current / goal.amount;
  return {
    ratio,
    remaining: Math.max(0, goal.amount - current),
  };
}

/**
 * Days that had writing. A pause is an empty day on the calendar,
 * not a failed streak that must be punished.
 */
export function writingDays(
  sessions: { start: Date | string; total: number }[]
): DayMark[] {
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    if (session.total <= 0) {
      continue;
    }
    const start =
      session.start instanceof Date ? session.start : new Date(session.start);
    if (Number.isNaN(start.getTime())) {
      continue;
    }
    const day = dayStamp(start);
    byDay.set(day, (byDay.get(day) ?? 0) + session.total);
  }
  const marks: DayMark[] = [];
  byDay.forEach((words, day) => {
    marks.push({ day, words });
  });
  marks.sort((left, right) => (left.day < right.day ? -1 : left.day > right.day ? 1 : 0));
  return marks;
}

/** Longest run of consecutive writing days. Gaps do not erase this history. */
export function longestRun(days: DayMark[]): number {
  if (days.length === 0) {
    return 0;
  }
  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(days[index - 1].day + "T12:00:00");
    const current = new Date(days[index].day + "T12:00:00");
    const diff = Math.round(
      (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diff === 1) {
      run += 1;
      if (run > best) {
        best = run;
      }
    } else {
      run = 1;
    }
  }
  return best;
}

/** Current run ending on the most recent writing day — a pause simply ends the run quietly. */
export function recentRun(days: DayMark[], today: string): number {
  if (days.length === 0) {
    return 0;
  }
  const written = new Set(days.map((mark) => mark.day));
  let cursor = written.has(today) ? today : days[days.length - 1].day;
  let run = 0;
  while (written.has(cursor)) {
    run += 1;
    const date = new Date(cursor + "T12:00:00");
    date.setDate(date.getDate() - 1);
    cursor = dayStamp(date);
  }
  return run;
}

export function monthGrid(
  year: number,
  month: number,
  days: DayMark[]
): { day: number; stamp: string; words: number }[] {
  const written = new Map<string, number>();
  for (const mark of days) {
    written.set(mark.day, mark.words);
  }
  const cells: { day: number; stamp: string; words: number }[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let day = 1; day <= last; day += 1) {
    const stamp = `${year}-${month < 10 ? `0${month}` : month}-${
      day < 10 ? `0${day}` : day
    }`;
    cells.push({ day, stamp, words: written.get(stamp) ?? 0 });
  }
  return cells;
}

export function sprintRemaining(sprint: Sprint, now: number): number {
  return Math.max(0, Math.ceil((sprint.endsAt - now) / 1000));
}

export function sprintFinished(sprint: Sprint, now: number): boolean {
  return now >= sprint.endsAt;
}

export function startSprint(seconds: number, now = Date.now()): Sprint {
  return {
    startedAt: now,
    endsAt: now + seconds * 1000,
    seconds,
  };
}

export function unitLabel(unit: SessionUnit | ProjectUnit): string {
  switch (unit) {
    case "words":
      return "words";
    case "minutes":
      return "minutes";
    case "lines":
      return "lines";
    case "stanzas":
      return "stanzas";
    case "chapters":
      return "chapters";
  }
}
