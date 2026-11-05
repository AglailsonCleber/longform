export const LONGFORM_CURRENT_PLUGIN_DATA_VERSION = 3;
export const LONGFORM_CURRENT_INDEX_VERSION = 1;

export type IndentedScene = {
  title: string;
  indent: number;
};

export type MultipleSceneDraft = {
  format: "scenes";
  title: string;
  titleInFrontmatter: boolean;
  draftTitle: string | null;
  vaultPath: string;
  workflow: string | null;
  sceneFolder: string;
  scenes: IndentedScene[];
  ignoredFiles: string[] | null;
  unknownFiles: string[];
  sceneTemplate: string | null;
};

export type SingleSceneDraft = {
  format: "single";
  title: string;
  titleInFrontmatter: boolean;
  draftTitle: string | null;
  vaultPath: string;
  workflow: string | null;
};

export type Draft = MultipleSceneDraft | SingleSceneDraft;

export type SerializedStep = {
  id: string;
  optionValues: { [id: string]: unknown };
};

export type SerializedWorkflow = {
  name: string;
  description: string;
  steps: SerializedStep[];
};

/**
 * Draft vault paths to either a map of scene names to word counts or,
 * in the case of single-scene drafts, the word count.
 */
export type DraftWordCounts = Record<string, Record<string, number> | number>;

export type WordCountSession = {
  /**
   * Start date for this session.
   */
  start: Date;

  /**
   * Total number of words written in this session.
   */
  total: number;

  /**
   * Stats in this session per draft.
   */
  drafts: Record<
    string,
    {
      /**
       * Total words written in this draft in this session.
       */
      total: number;

      /**
       * Stats in this session per scene.
       */
      scenes: Record<string, number>;
    }
  >;
};

export interface LongformPluginSettings {
  version: number;
  selectedDraftVaultPath: string | null;
  workflows: Record<string, SerializedWorkflow> | null;
  userScriptFolder: string | null;
  sessionStorage: "data" | "plugin-folder" | "file";
  sessions: WordCountSession[];
  showWordCountInStatusBar: boolean;
  startNewSessionEachDay: boolean;
  sessionGoal: number;
  /** Unit for the session goal: words, minutes, lines, or stanzas. */
  sessionGoalUnit: "words" | "minutes" | "lines" | "stanzas";
  /** Words per minute used only for the reader's reading-time estimate. */
  readingWordsPerMinute: number;
  applyGoalTo: "all" | "project" | "note";
  notifyOnGoal: boolean;
  countDeletionsForGoal: boolean;
  keepSessionCount: number;
  sessionFile: string;
  numberScenes: boolean;
  sceneTemplate: string | null;
  waitForSync: boolean;
  fallbackWaitEnabled: boolean;
  fallbackWaitTime: number;
  writeProperty: boolean;
  /** Accent the cursor line in Longform notes. */
  highlightCurrentLine: boolean;
  /** Hide the properties block on notes that belong to a project. */
  hideProperties: boolean;
  /** Dim every paragraph except the one being written. */
  focusMode: boolean;
  /** Keep the cursor line vertically centered. */
  typewriterMode: boolean;
  /** Narrow the writing column to a readable measure. */
  readingMeasure: boolean;
  /** Column width in characters. */
  measureWidth: number;
  /** Line height as a unitless multiplier. */
  lineHeight: number;
  /** Horizontal padding around the column, in pixels. */
  pageMargin: number;
  /** Longform notes use the opposite of Obsidian's current theme. */
  lightManuscript: boolean;
  /** BCP 47 language of a Longform note. Empty leaves the page unmarked. */
  pageLanguage: string;
  /** Use a chosen size for the manuscript instead of the app font. */
  manuscriptFont: boolean;
  /** Manuscript size in pixels when manuscriptFont is on. */
  manuscriptFontSize: number;
  /** Stop motion in the Longform page and panes. */
  reduceMotion: boolean;
  /** Push the manuscript text and page further apart. */
  strongContrast: boolean;
  /** Suggestions stay off until the author turns them on. */
  suggestions: boolean;
  /** OpenAI-compatible address. Empty until the author sets a local model or a service. */
  suggestionEndpoint: string;
  suggestionModel: string;
  /** The author's key. It is not written into the manuscript. */
  suggestionKey: string;
  // DEPRECATED. To be removed in future, needed now for migrations.
  projects: {
    [path: string]: {
      indexFile: string;
      draftsPath: string;
    };
  };
}

export const DEFAULT_SESSION_FILE = "longform-sessions.json";

export const DEFAULT_SETTINGS: LongformPluginSettings = {
  version: LONGFORM_CURRENT_PLUGIN_DATA_VERSION,
  selectedDraftVaultPath: null,
  workflows: null,
  userScriptFolder: null,
  sessionStorage: "data",
  sessions: [],
  showWordCountInStatusBar: true,
  startNewSessionEachDay: true,
  sessionGoal: 500,
  sessionGoalUnit: "words",
  readingWordsPerMinute: 200,
  applyGoalTo: "all",
  notifyOnGoal: true,
  countDeletionsForGoal: false,
  keepSessionCount: 30,
  sessionFile: DEFAULT_SESSION_FILE,
  numberScenes: false,
  sceneTemplate: null,
  writeProperty: false,
  highlightCurrentLine: false,
  hideProperties: false,
  focusMode: false,
  typewriterMode: false,
  readingMeasure: false,
  measureWidth: 66,
  lineHeight: 1.7,
  pageMargin: 32,
  lightManuscript: false,
  pageLanguage: "pt-BR",
  manuscriptFont: false,
  manuscriptFontSize: 18,
  reduceMotion: false,
  strongContrast: false,
  suggestions: false,
  suggestionEndpoint: "",
  suggestionModel: "local",
  suggestionKey: "",
  projects: {},
  waitForSync: false,
  fallbackWaitEnabled: true,
  fallbackWaitTime: 5,
};

export const TRACKED_SETTINGS_PATHS: (keyof LongformPluginSettings)[] = [
  "version",
  "projects",
  "selectedDraftVaultPath",
  "userScriptFolder",
  "sessionStorage",
  "sessions",
  "showWordCountInStatusBar",
  "startNewSessionEachDay",
  "sessionGoal",
  "sessionGoalUnit",
  "readingWordsPerMinute",
  "applyGoalTo",
  "notifyOnGoal",
  "countDeletionsForGoal",
  "keepSessionCount",
  "sessionFile",
  "numberScenes",
  "sceneTemplate",
  "waitForSync",
  "fallbackWaitEnabled",
  "fallbackWaitTime",
  "writeProperty",
  "highlightCurrentLine",
  "hideProperties",
  "focusMode",
  "typewriterMode",
  "readingMeasure",
  "measureWidth",
  "lineHeight",
  "pageMargin",
  "lightManuscript",
  "pageLanguage",
  "manuscriptFont",
  "manuscriptFontSize",
  "reduceMotion",
  "strongContrast",
  "suggestions",
  "suggestionEndpoint",
  "suggestionModel",
  "suggestionKey",
];

export const PASSTHROUGH_SAVE_SETTINGS_PATHS: (keyof LongformPluginSettings)[] =
  [
    "sessionStorage",
    "userScriptFolder",
    "showWordCountInStatusBar",
    "startNewSessionEachDay",
    "sessionGoal",
    "sessionGoalUnit",
    "readingWordsPerMinute",
    "applyGoalTo",
    "notifyOnGoal",
    "countDeletionsForGoal",
    "keepSessionCount",
    "sessionFile",
    "numberScenes",
    "sceneTemplate",
    "waitForSync",
    "fallbackWaitEnabled",
    "fallbackWaitTime",
    "writeProperty",
    "highlightCurrentLine",
    "hideProperties",
    "focusMode",
    "typewriterMode",
    "readingMeasure",
    "measureWidth",
    "lineHeight",
    "pageMargin",
    "lightManuscript",
    "pageLanguage",
    "manuscriptFont",
    "manuscriptFontSize",
    "reduceMotion",
    "strongContrast",
    "suggestions",
    "suggestionEndpoint",
    "suggestionModel",
    "suggestionKey",
  ];
