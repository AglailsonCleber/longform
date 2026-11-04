import { TFile } from "obsidian";

import {
  bookOpeningMarkdown,
  openingFromFrontmatter,
} from "src/model/output";
import type { CompileContext, CompileManuscriptInput } from "..";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
} from "./abstract-compile-step";

export const AddBookOpeningStep = makeBuiltinStep({
  id: "add-book-opening",
  description: {
    name: "Add Book Opening",
    description:
      "Puts a title page, dedication, epigraph, and contents list before the scenes. Those pages live on the project index, outside the scene list.",
    availableKinds: [CompileStepKind.Manuscript],
    options: [
      {
        id: "dedication",
        name: "Include dedication",
        description: "From longform-dedication on the project index.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
      {
        id: "epigraph",
        name: "Include epigraph",
        description: "From longform-epigraph on the project index.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
      {
        id: "contents",
        name: "Include contents",
        description: "A list of scene titles before the body.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
    ],
  },
  async compile(input: CompileManuscriptInput, context: CompileContext) {
    const indexFile = context.app.vault.getAbstractFileByPath(context.draft.vaultPath);
    const frontmatter =
      indexFile instanceof TFile
        ? context.app.metadataCache.getFileCache(indexFile)?.frontmatter
        : undefined;
    const opening = openingFromFrontmatter(context.draft.title, frontmatter);
    if (!(context.optionValues["dedication"] as boolean)) {
      opening.dedication = "";
    }
    if (!(context.optionValues["epigraph"] as boolean)) {
      opening.epigraph = "";
      opening.epigraphSource = "";
    }
    const titles: string[] = [];
    if (context.optionValues["contents"] as boolean) {
      if (context.draft.format === "scenes") {
        for (const scene of context.draft.scenes) {
          titles.push(scene.title);
        }
      } else {
        titles.push(context.draft.title);
      }
    }
    const front = bookOpeningMarkdown(opening, titles);
    return {
      contents: `${front}${input.contents}`,
    };
  },
});
