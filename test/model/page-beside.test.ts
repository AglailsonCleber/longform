import { describe, expect, it } from "vitest";

import { besideTargets, matchingEditorState } from "src/model/page-beside";
import type { Draft } from "src/model/types";

const current: Draft = {
  format: "scenes",
  title: "Romance",
  titleInFrontmatter: true,
  draftTitle: "Primeiro",
  vaultPath: "Romance/Primeiro/Primeiro.md",
  workflow: null,
  sceneFolder: "Cenas",
  scenes: [{ title: "Cozinha", indent: 0 }],
  ignoredFiles: [],
  unknownFiles: ["Pesquisa"],
  sceneTemplate: null,
};

const earlier: Draft = {
  format: "scenes",
  title: "Romance",
  titleInFrontmatter: true,
  draftTitle: "Rascunho",
  vaultPath: "Romance/Rascunho/Rascunho.md",
  workflow: null,
  sceneFolder: "Cenas",
  scenes: [{ title: "Cozinha", indent: 0 }],
  ignoredFiles: [],
  unknownFiles: [],
  sceneTemplate: null,
};

describe("matching editor state", () => {
  it("keeps live preview and reading view apart", () => {
    expect(matchingEditorState({ mode: "source", source: false })).toEqual({
      mode: "source",
      source: false,
    });
    expect(matchingEditorState({ mode: "preview", source: false })).toEqual({
      mode: "preview",
      source: false,
    });
    expect(matchingEditorState({ mode: "other" })).toBeNull();
  });
});

describe("pages beside the open scene", () => {
  it("lists this page, the other draft, and a project note", () => {
    expect(
      besideTargets(
        "Romance/Primeiro/Cenas/Cozinha.md",
        current,
        "Cozinha",
        [current, earlier]
      ).map((target) => [target.kind, target.path, target.label])
    ).toEqual([
      ["page", "Romance/Primeiro/Cenas/Cozinha.md", "This page"],
      ["draft", "Romance/Rascunho/Cenas/Cozinha.md", "Rascunho"],
      ["note", "Romance/Primeiro/Cenas/Pesquisa.md", "Pesquisa"],
    ]);
  });
});
