import { FORM_KEY } from "src/model/architecture";
import { WHEN_KEY } from "src/model/bible";
import {
  bodyFormOf,
  joinScenes,
  parseSeparatorKind,
  type SceneForOutput,
} from "src/model/output";
import type { CompileContext, CompileSceneInput } from "..";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
} from "./abstract-compile-step";

export const JoinScenesStep = makeBuiltinStep({
  id: "join-scenes",
  description: {
    name: "Join Scenes",
    description:
      "Joins every scene into one manuscript. Choose chapter titles, an asterism, or nothing between scenes. Verse keeps its lines; chronicle may lead with its date.",
    availableKinds: [CompileStepKind.Join],
    options: [
      {
        id: "separator",
        name: "Between scenes",
        description: 'One of: "title", "asterism", or "none".',
        type: CompileStepOptionType.Text,
        default: "title",
      },
    ],
  },
  compile(input: CompileSceneInput[], context: CompileContext) {
    const separator = parseSeparatorKind(
      String(context.optionValues["separator"] ?? "title")
    );
    const scenes: SceneForOutput[] = input.map((scene) => ({
      title: scene.name,
      text: scene.contents,
      form: bodyFormOf(scene.metadata?.frontmatter?.[FORM_KEY]),
      when: String(scene.metadata?.frontmatter?.[WHEN_KEY] ?? "").trim(),
      indent: scene.indentationLevel ?? 0,
    }));
    return {
      contents: joinScenes(scenes, separator),
    };
  },
});
