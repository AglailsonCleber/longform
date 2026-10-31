import { WHEN_KEY } from "./bible";
import { POV_KEY, ROLE_KEY, compiles } from "./architecture";

export const THREAD_KEY = "longform-threads";
export const STORY_KEY = "longform-story";
export const ARC_KEY = "longform-arcs";
export const BEAT_KEY = "longform-beat";
export const SCAFFOLD_KEY = "longform-scaffold";
export const PLANT_KEY = "longform-plants";
export const LEARN_KEY = "longform-learns";
export const TURN_KEY = "longform-turns";
export const PURPOSE_KEY = "longform-purpose";
export const CHANGE_KEY = "longform-change";
export const TENSION_KEY = "longform-tension";
export const ENDING_KEY = "longform-ending";
export const DISTANCE_KEY = "longform-distance";
export const ENDINGS_KEY = "longform-endings";

export const DISTANCES = ["close", "report", "camera"] as const;
export type Distance = (typeof DISTANCES)[number];

export const ENDINGS = ["trunk", "alternate"] as const;
export type EndingKind = (typeof ENDINGS)[number];

export const SCAFFOLD_KINDS = ["none", "acts", "journey", "beats"] as const;
export type ScaffoldKind = (typeof SCAFFOLD_KINDS)[number];

export type ArcMark = { who: string; change: string };
export type PlantMark = { id: string; name: string; kind: "plant" | "payoff" };
export type LearnMark = { who: string; fact: string };
export type TurnMark = { thing: string; becomes: "gone" | "kept" };

export type PlotScene = {
  path: string;
  title: string;
  role: string;
  pov: string;
  distance: Distance | "";
  when: string;
  story: string;
  threads: string[];
  arcs: ArcMark[];
  beat: string;
  plants: PlantMark[];
  learns: LearnMark[];
  turns: TurnMark[];
  purpose: string;
  change: string;
  tension: string;
  ending: EndingKind | "";
  text: string;
};

export type Scaffold = {
  kind: ScaffoldKind;
  names: string[];
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

function stringsOf(value: unknown): string[] {
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

function recordsOf(value: unknown): Record<string, unknown>[] {
  if (!(value instanceof Array)) {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      records.push(item as Record<string, unknown>);
    }
  }
  return records;
}

function recordOf(frontmatter: unknown): Record<string, unknown> {
  if (!frontmatter || typeof frontmatter !== "object") {
    return {};
  }
  return frontmatter as Record<string, unknown>;
}

function fold(value: string): string {
  return value.toLocaleLowerCase("pt-BR");
}

export function noteBody(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function mentions(text: string, needle: string, minimum: number): boolean {
  const phrase = needle.trim();
  if (phrase.length < minimum) {
    return false;
  }
  return fold(noteBody(text)).includes(fold(phrase));
}

export function plotSceneFromFrontmatter(
  path: string,
  title: string,
  frontmatter: unknown,
  text = ""
): PlotScene {
  const record = recordOf(frontmatter);
  const arcs: ArcMark[] = [];
  for (const item of recordsOf(record[ARC_KEY])) {
    const who = textOf(item.who);
    const change = textOf(item.change);
    if (who.length > 0 && change.length > 0) {
      arcs.push({ who, change });
    }
  }
  const plants: PlantMark[] = [];
  for (const item of recordsOf(record[PLANT_KEY])) {
    const name = textOf(item.name);
    const kind = item.kind === "payoff" ? "payoff" : item.kind === "plant" ? "plant" : "";
    if (name.length > 0 && kind) {
      plants.push({ id: textOf(item.id) || name, name, kind });
    }
  }
  const learns: LearnMark[] = [];
  for (const item of recordsOf(record[LEARN_KEY])) {
    const who = textOf(item.who);
    const fact = textOf(item.fact);
    if (who.length > 0 && fact.length > 0) {
      learns.push({ who, fact });
    }
  }
  const turns: TurnMark[] = [];
  for (const item of recordsOf(record[TURN_KEY])) {
    const thing = textOf(item.thing);
    const becomes = item.becomes === "gone" || item.becomes === "kept" ? item.becomes : "";
    if (thing.length > 0 && becomes) {
      turns.push({ thing, becomes });
    }
  }
  return {
    path,
    title,
    role: textOf(record[ROLE_KEY]),
    pov: textOf(record[POV_KEY]),
    distance: oneOf(record[DISTANCE_KEY], DISTANCES),
    when: textOf(record[WHEN_KEY]),
    story: textOf(record[STORY_KEY]),
    threads: stringsOf(record[THREAD_KEY]),
    arcs,
    beat: textOf(record[BEAT_KEY]),
    plants,
    learns,
    turns,
    purpose: textOf(record[PURPOSE_KEY]),
    change: textOf(record[CHANGE_KEY]),
    tension: textOf(record[TENSION_KEY]),
    ending: oneOf(record[ENDING_KEY], ENDINGS),
    text,
  };
}

export function bookScenes(scenes: PlotScene[]): PlotScene[] {
  const kept: PlotScene[] = [];
  for (const scene of scenes) {
    if (compiles(scene.role)) {
      kept.push(scene);
    }
  }
  return kept;
}

export type ThreadRow = {
  name: string;
  present: string[];
  gaps: string[];
};

export function threadRows(scenes: PlotScene[]): ThreadRow[] {
  const book = bookScenes(scenes);
  const names: string[] = [];
  for (const scene of book) {
    for (const thread of scene.threads) {
      if (names.indexOf(thread) < 0) {
        names.push(thread);
      }
    }
  }
  const rows: ThreadRow[] = [];
  for (const name of names) {
    let first = -1;
    let last = -1;
    const present: string[] = [];
    for (let index = 0; index < book.length; index += 1) {
      let onThread = false;
      for (const thread of book[index].threads) {
        if (thread === name) {
          onThread = true;
        }
      }
      if (onThread) {
        present.push(book[index].title);
        if (first < 0) {
          first = index;
        }
        last = index;
      }
    }
    const gaps: string[] = [];
    for (let index = first; index <= last; index += 1) {
      let onThread = false;
      for (const thread of book[index].threads) {
        if (thread === name) {
          onThread = true;
        }
      }
      if (!onThread) {
        gaps.push(book[index].title);
      }
    }
    rows.push({ name, present, gaps });
  }
  return rows;
}

export function crowdedTitles(scenes: PlotScene[]): string[] {
  const titles: string[] = [];
  for (const scene of bookScenes(scenes)) {
    if (scene.threads.length >= 3) {
      titles.push(scene.title);
    }
  }
  return titles;
}

function timed(scenes: PlotScene[], field: "story" | "when"): PlotScene[] {
  const decorated = scenes.map((scene, index) => ({ scene, index }));
  decorated.sort((left, right) => {
    const leftKey = field === "story" ? left.scene.story : left.scene.when;
    const rightKey = field === "story" ? right.scene.story : right.scene.when;
    const leftSet = leftKey.length > 0;
    const rightSet = rightKey.length > 0;
    if (leftSet && rightSet && leftKey !== rightKey) {
      return leftKey < rightKey ? -1 : 1;
    }
    if (leftSet !== rightSet) {
      return leftSet ? -1 : 1;
    }
    return left.index - right.index;
  });
  const ordered: PlotScene[] = [];
  for (const entry of decorated) {
    ordered.push(entry.scene);
  }
  return ordered;
}

export function storyOrder(scenes: PlotScene[]): PlotScene[] {
  return timed(bookScenes(scenes), "story");
}

export function worldOrder(scenes: PlotScene[]): PlotScene[] {
  return timed(bookScenes(scenes), "when");
}

export function sameTitles(left: PlotScene[], right: PlotScene[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].title !== right[index].title) {
      return false;
    }
  }
  return true;
}

export type ArcLine = { who: string; scene: string; change: string };

export function arcsByPerson(scenes: PlotScene[]): ArcLine[] {
  const lines: ArcLine[] = [];
  for (const scene of bookScenes(scenes)) {
    for (const arc of scene.arcs) {
      lines.push({ who: arc.who, scene: scene.title, change: arc.change });
    }
  }
  return lines;
}

export function scaffoldBeats(kind: ScaffoldKind): string[] {
  if (kind === "acts") {
    return ["Act 1", "Act 2", "Act 3"];
  }
  if (kind === "journey") {
    return ["Ordinary world", "Call", "Threshold", "Tests", "Ordeal", "Reward", "Return"];
  }
  if (kind === "beats") {
    return ["Opening", "Turn", "Midpoint", "Crisis", "Climax", "Resolution"];
  }
  return [];
}

export function scaffoldFromFrontmatter(frontmatter: unknown): Scaffold {
  const record = recordOf(frontmatter);
  const raw = record[SCAFFOLD_KEY];
  const kind = oneOf(
    raw && typeof raw === "object" ? (raw as Record<string, unknown>).kind : raw,
    SCAFFOLD_KINDS
  );
  const chosen: ScaffoldKind = kind || "none";
  return { kind: chosen, names: scaffoldBeats(chosen) };
}

export function beatsWithoutScenes(scaffold: Scaffold, scenes: PlotScene[]): string[] {
  if (scaffold.kind === "none") {
    return [];
  }
  const missing: string[] = [];
  for (const name of scaffold.names) {
    let found = false;
    for (const scene of bookScenes(scenes)) {
      if (scene.beat === name) {
        found = true;
      }
    }
    if (!found) {
      missing.push(name);
    }
  }
  return missing;
}

export type PlantReport = {
  unpaid: { id: string; name: string; scene: string }[];
  ungrounded: { id: string; name: string; scene: string }[];
};

export function plantReport(scenes: PlotScene[]): PlantReport {
  const planted = new Set<string>();
  const unpaid = new Map<string, { id: string; name: string; scene: string }>();
  const ungrounded: PlantReport["ungrounded"] = [];
  for (const scene of bookScenes(scenes)) {
    for (const plant of scene.plants) {
      if (plant.kind === "plant") {
        planted.add(plant.id);
        unpaid.set(plant.id, { id: plant.id, name: plant.name, scene: scene.title });
      }
    }
    for (const plant of scene.plants) {
      if (plant.kind === "payoff" && !planted.has(plant.id)) {
        ungrounded.push({ id: plant.id, name: plant.name, scene: scene.title });
      }
      if (plant.kind === "payoff") {
        unpaid.delete(plant.id);
      }
    }
  }
  const waiting: PlantReport["unpaid"] = [];
  unpaid.forEach((item) => {
    waiting.push(item);
  });
  return { unpaid: waiting, ungrounded };
}

export type Leak = { scene: string; who: string; fact: string };

export function secretLeaks(scenes: PlotScene[]): Leak[] {
  const book = bookScenes(scenes);
  const leaks: Leak[] = [];
  for (let index = 0; index < book.length; index += 1) {
    const scene = book[index];
    if (scene.pov.length === 0) {
      continue;
    }
    const known: string[] = [];
    for (let earlier = 0; earlier < index; earlier += 1) {
      for (const learn of book[earlier].learns) {
        if (fold(learn.who) === fold(scene.pov) && known.indexOf(learn.fact) < 0) {
          known.push(learn.fact);
        }
      }
    }
    const learning: string[] = [];
    for (const learn of scene.learns) {
      if (fold(learn.who) === fold(scene.pov)) {
        learning.push(learn.fact);
      }
    }
    const facts: string[] = [];
    for (const item of book) {
      for (const learn of item.learns) {
        if (facts.indexOf(learn.fact) < 0) {
          facts.push(learn.fact);
        }
      }
    }
    for (const fact of facts) {
      const already = known.indexOf(fact) >= 0;
      let learnsNow = false;
      for (const item of learning) {
        if (item === fact) {
          learnsNow = true;
        }
      }
      if (!already && !learnsNow && mentions(scene.text, fact, 3)) {
        leaks.push({ scene: scene.title, who: scene.pov, fact });
      }
    }
  }
  return leaks;
}

export type KnownFact = { who: string; fact: string; since: string };

export function knowledge(scenes: PlotScene[]): KnownFact[] {
  const known: KnownFact[] = [];
  for (const scene of bookScenes(scenes)) {
    for (const learn of scene.learns) {
      let seen = false;
      for (const item of known) {
        if (fold(item.who) === fold(learn.who) && item.fact === learn.fact) {
          seen = true;
        }
      }
      if (!seen) {
        known.push({ who: learn.who, fact: learn.fact, since: scene.title });
      }
    }
  }
  return known;
}

export type TruthHole = { thing: string; lostIn: string; usedIn: string };

export function truthHoles(scenes: PlotScene[]): TruthHole[] {
  const gone = new Map<string, string>();
  const holes: TruthHole[] = [];
  for (const scene of bookScenes(scenes)) {
    gone.forEach((lostIn, thing) => {
      if (mentions(scene.text, thing, 2)) {
        holes.push({ thing, lostIn, usedIn: scene.title });
      }
    });
    for (const turn of scene.turns) {
      if (turn.becomes === "gone") {
        gone.set(turn.thing, scene.title);
      } else {
        gone.delete(turn.thing);
      }
    }
  }
  return holes;
}

export function withoutPurpose(scenes: PlotScene[]): string[] {
  const titles: string[] = [];
  for (const scene of bookScenes(scenes)) {
    if (scene.purpose.length === 0) {
      titles.push(scene.title);
    }
  }
  return titles;
}

export function endingGroups(scenes: PlotScene[]): {
  trunk: PlotScene[];
  alternates: PlotScene[];
} {
  const trunk: PlotScene[] = [];
  const alternates: PlotScene[] = [];
  for (const scene of scenes) {
    if (scene.ending === "trunk") {
      trunk.push(scene);
    }
    if (scene.ending === "alternate") {
      alternates.push(scene);
    }
  }
  return { trunk, alternates };
}

export function scenesForNarrator(
  scenes: PlotScene[],
  pov: string,
  distance: Distance | ""
): PlotScene[] {
  const matched: PlotScene[] = [];
  for (const scene of scenes) {
    if (pov && fold(scene.pov) !== fold(pov)) {
      continue;
    }
    if (distance && scene.distance !== distance) {
      continue;
    }
    matched.push(scene);
  }
  return matched;
}

function putText(frontmatter: Record<string, unknown>, key: string, value: string): void {
  if (value.trim().length === 0) {
    delete frontmatter[key];
  } else {
    frontmatter[key] = value.trim();
  }
}

export function assignPlot(frontmatter: Record<string, unknown>, scene: PlotScene): void {
  putText(frontmatter, POV_KEY, scene.pov);
  putText(frontmatter, DISTANCE_KEY, scene.distance);
  putText(frontmatter, WHEN_KEY, scene.when);
  putText(frontmatter, STORY_KEY, scene.story);
  putText(frontmatter, BEAT_KEY, scene.beat);
  putText(frontmatter, PURPOSE_KEY, scene.purpose);
  putText(frontmatter, CHANGE_KEY, scene.change);
  putText(frontmatter, TENSION_KEY, scene.tension);
  putText(frontmatter, ENDING_KEY, scene.ending);
  if (scene.threads.length === 0) {
    delete frontmatter[THREAD_KEY];
  } else {
    frontmatter[THREAD_KEY] = scene.threads;
  }
  if (scene.arcs.length === 0) {
    delete frontmatter[ARC_KEY];
  } else {
    frontmatter[ARC_KEY] = scene.arcs;
  }
  if (scene.plants.length === 0) {
    delete frontmatter[PLANT_KEY];
  } else {
    frontmatter[PLANT_KEY] = scene.plants;
  }
  if (scene.learns.length === 0) {
    delete frontmatter[LEARN_KEY];
  } else {
    frontmatter[LEARN_KEY] = scene.learns;
  }
  if (scene.turns.length === 0) {
    delete frontmatter[TURN_KEY];
  } else {
    frontmatter[TURN_KEY] = scene.turns;
  }
}

export function assignScaffold(
  frontmatter: Record<string, unknown>,
  kind: ScaffoldKind
): void {
  if (kind === "none") {
    delete frontmatter[SCAFFOLD_KEY];
    return;
  }
  frontmatter[SCAFFOLD_KEY] = { kind };
}

export function parseList(value: string): string[] {
  return stringsOf(value);
}

export function parseArcs(value: string): ArcMark[] {
  const arcs: ArcMark[] = [];
  for (const line of value.split(/\r?\n/)) {
    const parts = line.split(":");
    const who = (parts[0] ?? "").trim();
    const change = parts.slice(1).join(":").trim();
    if (who.length > 0 && change.length > 0) {
      arcs.push({ who, change });
    }
  }
  return arcs;
}

export function parsePlants(value: string): PlantMark[] {
  const plants: PlantMark[] = [];
  for (const line of value.split(/\r?\n/)) {
    const parts = line.split("|");
    const name = (parts[0] ?? "").trim();
    const kindName = (parts[1] ?? "").trim();
    const kind = kindName === "payoff" ? "payoff" : kindName === "plant" ? "plant" : "";
    if (name.length > 0 && kind) {
      plants.push({ id: name, name, kind });
    }
  }
  return plants;
}

export function parseLearns(value: string): LearnMark[] {
  const learns: LearnMark[] = [];
  for (const line of value.split(/\r?\n/)) {
    const parts = line.split(":");
    const who = (parts[0] ?? "").trim();
    const fact = parts.slice(1).join(":").trim();
    if (who.length > 0 && fact.length > 0) {
      learns.push({ who, fact });
    }
  }
  return learns;
}

export function parseTurns(value: string): TurnMark[] {
  const turns: TurnMark[] = [];
  for (const line of value.split(/\r?\n/)) {
    const parts = line.split("|");
    const thing = (parts[0] ?? "").trim();
    const becomesName = (parts[1] ?? "").trim();
    const becomes = becomesName === "gone" || becomesName === "kept" ? becomesName : "";
    if (thing.length > 0 && becomes) {
      turns.push({ thing, becomes });
    }
  }
  return turns;
}
