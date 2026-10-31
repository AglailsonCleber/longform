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
import { insertMissingWord } from "./missing-word";
import { insertDialogueDash, insertHyphen, insertQuotes } from "./portuguese";
import { openCardAtCursor, replaceBookName } from "./bible";
import { openBesidePage, restoreRecoveredPage } from "./page-beside";
import { readAloud, stopReading } from "./read-aloud";
import {
  characterCue,
  newStanza,
  parenthetical,
  sceneHeading,
  setColumnForm,
  setProseForm,
  setScriptForm,
  setVerseForm,
} from "./page-form";
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
  insertMissingWord,
  insertDialogueDash,
  insertHyphen,
  insertQuotes,
  openCardAtCursor,
  replaceBookName,
  openBesidePage,
  restoreRecoveredPage,
  readAloud,
  stopReading,
  setProseForm,
  setVerseForm,
  setColumnForm,
  setScriptForm,
  newStanza,
  sceneHeading,
  characterCue,
  parenthetical,
];

export function addCommands(plugin: LongformPlugin) {
  commandBuilders.forEach((c) => {
    plugin.addCommand(c(plugin));
  });
}
