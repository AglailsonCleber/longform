import { describe, expect, it } from "vitest";

import {
  arcsByPerson,
  beatsWithoutScenes,
  crowdedTitles,
  endingGroups,
  knowledge,
  plantReport,
  plotSceneFromFrontmatter,
  scaffoldFromFrontmatter,
  scenesForNarrator,
  secretLeaks,
  storyOrder,
  threadRows,
  truthHoles,
  withoutPurpose,
  worldOrder,
  STORY_KEY,
  THREAD_KEY,
} from "src/model/plot";
import type { PlotScene } from "src/model/plot";

function scene(partial: Partial<PlotScene> & Pick<PlotScene, "title">): PlotScene {
  return {
    path: `${partial.title}.md`,
    role: "",
    pov: "",
    distance: "",
    when: "",
    story: "",
    threads: [],
    arcs: [],
    beat: "",
    plants: [],
    learns: [],
    turns: [],
    purpose: "move",
    change: "",
    tension: "",
    ending: "",
    text: "",
    ...partial,
  };
}

describe("threads and time", () => {
  it("shows a gap in a thread and a scene carrying too many", () => {
    const scenes = [
      scene({ title: "A", threads: ["love", "war", "money"] }),
      scene({ title: "B", threads: ["war"] }),
      scene({ title: "C", threads: ["love"] }),
    ];
    const love = threadRows(scenes).find((row) => row.name === "love");
    expect(love?.gaps).toEqual(["B"]);
    expect(crowdedTitles(scenes)).toEqual(["A"]);
  });

  it("keeps chapter order, story order, and world time apart", () => {
    const scenes = [
      scene({ title: "Agora", story: "2", when: "era-c" }),
      scene({ title: "Antes", story: "1", when: "era-a" }),
      scene({ title: "Depois", story: "3", when: "era-b" }),
    ];
    expect(storyOrder(scenes).map((item) => item.title)).toEqual(["Antes", "Agora", "Depois"]);
    expect(worldOrder(scenes).map((item) => item.title)).toEqual(["Antes", "Depois", "Agora"]);
  });

  it("reads story time from beside the manuscript", () => {
    const piece = plotSceneFromFrontmatter("Cenas/A.md", "A", {
      longform: { format: "scenes" },
      [STORY_KEY]: "1",
      [THREAD_KEY]: ["love"],
    });
    expect(piece.story).toBe("1");
    expect(piece.threads).toEqual(["love"]);
  });
});

describe("continuity", () => {
  it("groups what changes for each person", () => {
    const lines = arcsByPerson([
      scene({ title: "A", arcs: [{ who: "Maria", change: "trusts" }] }),
      scene({ title: "C", arcs: [{ who: "Maria", change: "leaves" }] }),
    ]);
    expect(lines.map((line) => `${line.who} ${line.scene} ${line.change}`)).toEqual([
      "Maria A trusts",
      "Maria C leaves",
    ]);
  });

  it("leaves the scaffold empty until the writer asks for one", () => {
    expect(scaffoldFromFrontmatter({}).kind).toBe("none");
    expect(beatsWithoutScenes({ kind: "none", names: [] }, [])).toEqual([]);
    expect(
      beatsWithoutScenes(
        { kind: "acts", names: ["Act 1", "Act 2", "Act 3"] },
        [scene({ title: "A", beat: "Act 1" })]
      )
    ).toEqual(["Act 2", "Act 3"]);
  });

  it("shows a plant with no payoff and a payoff with no plant", () => {
    const report = plantReport([
      scene({
        title: "A",
        plants: [{ id: "key", name: "key", kind: "plant" }],
      }),
      scene({
        title: "B",
        plants: [{ id: "letter", name: "letter", kind: "payoff" }],
      }),
    ]);
    expect(report.unpaid.map((item) => item.name)).toEqual(["key"]);
    expect(report.ungrounded.map((item) => item.scene)).toEqual(["B"]);
  });

  it("flags a secret the viewpoint has not learned yet", () => {
    const scenes = [
      scene({
        title: "A",
        pov: "João",
        learns: [{ who: "João", fact: "the will" }],
        text: "the will is in the desk",
      }),
      scene({
        title: "B",
        pov: "Maria",
        text: "She mentions the will.",
      }),
      scene({
        title: "C",
        pov: "Maria",
        learns: [{ who: "Maria", fact: "the will" }],
        text: "Maria reads the will.",
      }),
    ];
    expect(secretLeaks(scenes).map((leak) => leak.scene)).toEqual(["B"]);
    expect(knowledge(scenes).map((item) => `${item.who} ${item.since}`)).toEqual([
      "João A",
      "Maria C",
    ]);
  });

  it("flags a lost thing used again later", () => {
    const holes = truthHoles([
      scene({
        title: "Oito",
        text: "The locket falls.",
        turns: [{ thing: "locket", becomes: "gone" }],
      }),
      scene({ title: "Vinte", text: "She opens the locket." }),
    ]);
    expect(holes.map((hole) => hole.usedIn)).toEqual(["Vinte"]);
  });

  it("lists a scene with no purpose and keeps an alternate ending out of the book", () => {
    expect(withoutPurpose([scene({ title: "Solta", purpose: "" })])).toEqual(["Solta"]);
    const groups = endingGroups([
      scene({ title: "Fim", ending: "trunk" }),
      scene({ title: "Outro", ending: "alternate", role: "variant" }),
    ]);
    expect(groups.trunk.map((item) => item.title)).toEqual(["Fim"]);
    expect(groups.alternates.map((item) => item.title)).toEqual(["Outro"]);
    expect(storyOrder(groups.alternates)).toEqual([]);
  });

  it("filters narrator and distance", () => {
    const scenes = [
      scene({ title: "Perto", pov: "Maria", distance: "close" }),
      scene({ title: "Relato", pov: "Maria", distance: "report" }),
      scene({ title: "Outro", pov: "João", distance: "close" }),
    ];
    expect(scenesForNarrator(scenes, "Maria", "close").map((item) => item.title)).toEqual([
      "Perto",
    ]);
  });
});
