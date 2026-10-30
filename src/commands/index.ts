import { compileCurrent, compileSelection } from "./compile";
import {
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  jumpToProject,
  showLongform,
  jumpToScene,
  revealProjectFolder,
  focusNewSceneField,
} from "./navigation";
import { indentScene, unindentScene } from "./indentation";
import type LongformPlugin from "src/main";
import {
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
} from "./templates";
import { startNewSession } from "./word-counts";
import {
  insertMarginNote,
  listMarginNotes,
  showPrivateComments,
} from "./margin-note";
import {
  toggleFocusMode,
  toggleHighlightCurrentLine,
  toggleTypewriterMode,
} from "./page-mode";

const commandBuilders = [
  compileCurrent,
  compileSelection,
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  indentScene,
  unindentScene,
  jumpToProject,
  jumpToScene,
  showLongform,
  revealProjectFolder,
  focusNewSceneField,
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
  startNewSession,
  toggleHighlightCurrentLine,
  toggleFocusMode,
  toggleTypewriterMode,
  insertMarginNote,
  listMarginNotes,
  showPrivateComments,
];

export function addCommands(plugin: LongformPlugin) {
  commandBuilders.forEach((c) => {
    plugin.addCommand(c(plugin));
  });
}
