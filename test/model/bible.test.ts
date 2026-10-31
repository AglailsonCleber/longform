import { describe, expect, it } from "vitest";

import {
  cardFromFrontmatter,
  cardsForProject,
  dialogueVoiceHits,
  nameHitsInLine,
  nameSound,
  replaceWholeName,
  scenesForPlace,
  scenesInEra,
  type BibleCard,
  type SceneSheet,
} from "src/model/bible";

const maria = cardFromFrontmatter("Biblia/Maria.md", {
  "longform-card": {
    project: "Romance",
    kind: "person",
    status: "canon",
    basis: "invention",
    names: ["Maria José", "Maria"],
    bonds: [{ with: "João", label: "irmã", from: "dia 1", until: "dia 12" }],
    voice: { words: ["visse"], never: ["você"] },
  },
});

const joao = cardFromFrontmatter("Biblia/Joao.md", {
  "longform-card": {
    project: "Romance",
    kind: "person",
    status: "hypothesis",
    basis: "fact",
    names: ["João"],
    voice: { never: ["oxente"] },
  },
});

const kitchen = cardFromFrontmatter("Biblia/Cozinha.md", {
  "longform-card": {
    project: "Romance",
    kind: "place",
    names: ["Cozinha"],
  },
});

function scene(partial: Partial<SceneSheet> & { path: string; title: string }): SceneSheet {
  return {
    draft: "Primeiro",
    text: "",
    place: "",
    when: "",
    ...partial,
  };
}

describe("bible cards", () => {
  it("keeps canon apart from fact, and a bond keeps its dates", () => {
    expect(maria?.status).toBe("canon");
    expect(maria?.basis).toBe("invention");
    expect(joao?.status).toBe("hypothesis");
    expect(joao?.basis).toBe("fact");
    expect(maria?.bonds[0]).toEqual({
      with: "João",
      label: "irmã",
      from: "dia 1",
      until: "dia 12",
    });
  });

  it("shares one cast across drafts of the same project", () => {
    const cards = [maria, joao].filter((card): card is BibleCard => card !== null);
    expect(cardsForProject(cards, "Romance").map((card) => card.names[0])).toEqual([
      "Maria José",
      "João",
    ]);
    expect(cardsForProject(cards, "Outro")).toEqual([]);
  });
});

describe("names in the text", () => {
  it("prefers the long alias and skips a name inside another word", () => {
    const cards = [maria].filter((card): card is BibleCard => card !== null);
    expect(nameHitsInLine("Maria José chegou.", cards).map((hit) => hit.name)).toEqual([
      "Maria José",
    ]);
    expect(nameHitsInLine("Mariana chegou.", cards)).toEqual([]);
  });

  it("ignores a name inside a private note", () => {
    const cards = [maria].filter((card): card is BibleCard => card !== null);
    expect(nameHitsInLine("%%? Maria %%", cards)).toEqual([]);
  });

  it("replaces the name in the book and leaves the frontmatter alone", () => {
    const text = ["---", "title: Maria", "---", "Maria viu Mariana."].join("\n");
    const replaced = replaceWholeName(text, "Maria", "Luzia");
    expect(replaced.count).toBe(1);
    expect(replaced.text).toContain("title: Maria");
    expect(replaced.text).toContain("Luzia viu Mariana.");
  });
});

describe("voice, map, calendar, and tongue", () => {
  it("flags a forbidden word when the speaker is named", () => {
    const cards = [maria, joao].filter((card): card is BibleCard => card !== null);
    const hits = dialogueVoiceHits("Maria falou.\n— Você vem?", cards);
    expect(hits).toEqual([
      { line: 1, word: "você", who: "Maria José", knownSpeaker: true },
    ]);
  });

  it("points a place at the scenes that happen there", () => {
    const place = kitchen as BibleCard;
    const scenes = [
      scene({ path: "a.md", title: "Manhã", text: "A Cozinha estava quente." }),
      scene({ path: "b.md", title: "Rua", text: "A rua.", place: "Cozinha" }),
      scene({ path: "c.md", title: "Noite", text: "Silêncio." }),
    ];
    expect(scenesForPlace(place, scenes).map((item) => item.title)).toEqual([
      "Manhã",
      "Rua",
    ]);
  });

  it("aligns a scene to an era by its story date", () => {
    const scenes = [
      scene({ path: "a.md", title: "Seca", when: "Seca, dia 3" }),
      scene({ path: "b.md", title: "Chuva", when: "Chuva" }),
    ];
    expect(scenesInEra("seca", scenes).map((item) => item.title)).toEqual(["Seca"]);
  });

  it("checks a new name against the tongue's endings", () => {
    const lexicon = { tongue: "sertanejo", endings: ["a", "é"], samples: ["Maria"] };
    expect(nameSound("Luzia", lexicon).fits).toBe(true);
    expect(nameSound("Pedro", lexicon).fits).toBe(false);
    expect(nameSound("Pedro", null).detail).toBe("No tongue is set yet.");
  });
});
