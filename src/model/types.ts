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
  /** Light paper for Longform notes while the rest of the app stays as it is. */
  lightManuscript: boolean;
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
  applyGoalTo: "all",
  notifyOnGoal: true,
  countDeletionsForGoal: false,
  keepSessionCount: 30,
  sessionFile: DEFAULT_SESSION_FILE,
  numberScenes: false,
  sceneTemplate: null,
  writeProperty: false,
  highlightCurrentLine: false,
  focusMode: false,
  typewriterMode: false,
  readingMeasure: false,
  measureWidth: 66,
  lineHeight: 1.7,
  pageMargin: 32,
  lightManuscript: false,
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
  "focusMode",
  "typewriterMode",
  "readingMeasure",
  "measureWidth",
  "lineHeight",
  "pageMargin",
  "lightManuscript",
];

export const PASSTHROUGH_SAVE_SETTINGS_PATHS: (keyof LongformPluginSettings)[] =
  [
    "sessionStorage",
    "userScriptFolder",
    "showWordCountInStatusBar",
    "startNewSessionEachDay",
    "sessionGoal",
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
    "focusMode",
    "typewriterMode",
    "readingMeasure",
    "measureWidth",
    "lineHeight",
    "pageMargin",
    "lightManuscript",
  ];
