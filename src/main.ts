import {
  Plugin,
  WorkspaceLeaf,
  FileView,
  MarkdownView,
  addIcon,
  Notice,
  TAbstractFile,
  TFile,
  TFolder,
  normalizePath,
} from "obsidian";
import debounce from "lodash/debounce";
import once from "lodash/once";
import pick from "lodash/pick";
import { derived, type Unsubscriber } from "svelte/store";
import { get } from "svelte/store";

import {
  VIEW_TYPE_LONGFORM_EXPLORER,
  ExplorerPane,
} from "./view/explorer/ExplorerPane";
import {
  VIEW_TYPE_LONGFORM_NOTES,
  NotesPane,
} from "./view/notes-pane/NotesPane";
import {
  PASSTHROUGH_SAVE_SETTINGS_PATHS,
  type Draft,
  type LongformPluginSettings,
  type SerializedWorkflow,
  type WordCountSession,
} from "./model/types";
import { DEFAULT_SETTINGS, TRACKED_SETTINGS_PATHS } from "./model/types";
import { activeFile, goalProgress, selectedTab } from "./view/stores";
import { ICON_NAME, ICON_SVG } from "./view/icon";
import { LongformSettingsTab } from "./view/settings/LongformSettings";
import {
  deserializeWorkflow,
  serializeWorkflow,
} from "./compile/serialization";
import type { Workflow } from "./compile";
import { DEFAULT_WORKFLOWS } from "./compile";
import { UserScriptObserver } from "./model/user-script-observer";
import { StoreVaultSync } from "./model/store-vault-sync";
import {
  selectedDraft,
  selectedDraftVaultPath,
  workflows,
  initialized,
  pluginSettings,
  drafts,
  sessions,
} from "./model/stores";
import { addCommands } from "./commands";
import { determineMigrationStatus } from "./model/migration";
import { applyPortugueseSpellcheck } from "./model/spellcheck";
import {
  PAGE_FORM_CLASSES,
  PAGE_FORM_KEY,
  pageForm,
  pageFormClass,
} from "./model/page-form";
import { draftForPath } from "./model/scene-navigation";
import { WritingSessionTracker } from "./model/writing-session-tracker";
import NewProjectModal from "./view/project-lifecycle/new-project-modal";
import { LongformAPI } from "./api/LongformAPI";
import { cardFromFrontmatter } from "./model/bible";
import type { BibleCard } from "./model/bible";
import { bibleCards } from "./model/bible-store";
import { longformBibleExtension } from "./view/bible-extension";
import { longformMarginNoteExtension } from "./view/margin-note-extension";
import { longformMissingWordExtension } from "./view/missing-word-extension";
import { PageRecovery } from "./view/page-recovery";
import { syncWritingBar } from "./view/writing-bar";
import { longformPageExtension } from "./view/page-mode-extension";
import {
  MANUSCRIPT_DARK_CLASS,
  MANUSCRIPT_LIGHT_CLASS,
  PAGE_MODE_CLASSES,
  appColorScheme,
  manuscriptContrastClass,
  pageModeClasses,
  READING_MEASURE_PROPERTIES,
  readingMeasureVars,
} from "./view/page-mode";

const LONGFORM_LEAF_CLASS = "longform-leaf";
const PAGE_SETTING_KEYS: (keyof LongformPluginSettings)[] = [
  "highlightCurrentLine",
  "focusMode",
  "typewriterMode",
  "readingMeasure",
  "measureWidth",
  "lineHeight",
  "pageMargin",
  "lightManuscript",
  "portuguesePage",
];

// TODO: Try and abstract away more logic from actual plugin hooks here

export default class LongformPlugin extends Plugin {
  pageRecovery!: PageRecovery;
  // Local mirror of the pluginSettings store
  // since this class does a lot of ad-hoc settings fetching.
  // More efficient than a lot of get() calls.
  cachedSettings: LongformPluginSettings | null = null;
  private unsubscribeSettings: Unsubscriber;
  private unsubscribeWorkflows: Unsubscriber;
  private unsubscribeDrafts: Unsubscriber;
  private unsubscribeSelectedDraft: Unsubscriber;
  private unsubscribeSessions: Unsubscriber;
  private unsubscribeGoalNotification: Unsubscriber;
  private userScriptObserver: UserScriptObserver;
  writingSessionTracker: WritingSessionTracker;
  public api: LongformAPI;

  private storeVaultSync: StoreVaultSync;

  async onload(): Promise<void> {
    console.log(`[Longform] Starting Longform ${this.manifest.version}…`);
    addIcon(ICON_NAME, ICON_SVG);

    this.registerView(
      VIEW_TYPE_LONGFORM_EXPLORER,
      (leaf: WorkspaceLeaf) => new ExplorerPane(leaf)
    );
    this.registerView(
      VIEW_TYPE_LONGFORM_NOTES,
      (leaf: WorkspaceLeaf) => new NotesPane(leaf)
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TAbstractFile) => {
        if (!(file instanceof TFolder)) {
          return;
        }
        menu.addItem((item) => {
          item
            .setTitle("Create Longform Project")
            .setIcon(ICON_NAME)
            .onClick(() => {
              new NewProjectModal(this.app, file).open();
            });
        });
      })
    );

    // Settings
    this.unsubscribeSettings = pluginSettings.subscribe(async (value) => {
      let shouldSave = false;

      const changeInKeys = (
        obj1: Record<string, any>,
        obj2: Record<string, any>,
        keys: string[]
      ): boolean => {
        return !!keys.find((k) => obj1[k] !== obj2[k]);
      };

      if (
        this.cachedSettings &&
        changeInKeys(
          this.cachedSettings,
          value,
          PASSTHROUGH_SAVE_SETTINGS_PATHS
        )
      ) {
        shouldSave = true;
      }

      if (
        this.cachedSettings &&
        changeInKeys(this.cachedSettings, value, PAGE_SETTING_KEYS)
      ) {
        this.styleLongformLeaves();
      }
      if (
        !this.cachedSettings ||
        this.cachedSettings.portuguesePage !== value.portuguesePage
      ) {
        applyPortugueseSpellcheck(value.portuguesePage);
      }

      this.cachedSettings = value;

      if (shouldSave) {
        await this.saveSettings();
      }
    });

    await this.loadSettings();
    this.addSettingTab(new LongformSettingsTab(this.app, this));

    this.storeVaultSync = new StoreVaultSync(this.app);

    this.app.workspace.onLayoutReady(this.postLayoutInit.bind(this));

    // Track active file
    activeFile.set(this.app.workspace.getActiveFile());
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.queuePageStyle();
        if (leaf.view instanceof FileView) {
          activeFile.set(leaf.view.file);
        }
        // NOTE: This may break, as it's undocumented.
        // Need some way to determine the empty state.
        else if (
          (leaf.view as any).emptyTitleEl &&
          (leaf.view as any).emptyStateEl
        ) {
          activeFile.set(null);
        }
      })
    );

    this.pageRecovery = new PageRecovery(this.app);

    addCommands(this);
    this.registerEditorExtension(longformPageExtension);
    this.registerEditorExtension(longformMarginNoteExtension);
    this.registerEditorExtension(longformMissingWordExtension);
    this.registerEditorExtension(longformBibleExtension);
    this.register(() => {
      document.removeEventListener("longform-open-card", this.openBibleCard);
    });
    document.addEventListener("longform-open-card", this.openBibleCard);

    // Dynamically style longform scenes
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.queuePageStyle();
      })
    );
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.styleLongformLeaves();
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        this.styleLongformLeaves();
        this.refreshBible();
      })
    );
    this.unsubscribeDrafts = drafts.subscribe((allDrafts) => {
      this.styleLongformLeaves(allDrafts);
    });
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        const file = info.file;
        if (!file || !draftForPath(file.path, get(drafts))) {
          return;
        }
        this.pageRecovery.note(file.path, editor.getValue());
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.queuePageStyle();
        if (!(file instanceof TFile) || !draftForPath(file.path, get(drafts))) {
          return;
        }
        void this.pageRecovery.offer(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.pageRecovery.rename(oldPath, file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.pageRecovery.forget(file.path);
      })
    );

    this.api = new LongformAPI();
  }

  onunload(): void {
    this.pageRecovery?.flush();
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      leaf.view.containerEl.querySelector(":scope > .longform-writing-bar")?.remove();
      leaf.view.containerEl.classList.remove(
        ...PAGE_MODE_CLASSES,
        ...PAGE_FORM_CLASSES,
        "longform-lang-pt",
        "longform-measure",
        MANUSCRIPT_LIGHT_CLASS,
        MANUSCRIPT_DARK_CLASS
      );
      for (const name of READING_MEASURE_PROPERTIES) {
        leaf.view.containerEl.style.removeProperty(name);
      }
    });
    this.userScriptObserver.destroy();
    this.storeVaultSync.destroy();
    this.unsubscribeSettings();
    this.unsubscribeWorkflows();
    this.unsubscribeSelectedDraft();
    this.unsubscribeDrafts();
    this.unsubscribeSessions();
    this.unsubscribeGoalNotification();
    this.writingSessionTracker.destroy();
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
      .forEach((leaf) => leaf.detach());
  }

  async loadSettings(): Promise<void> {
    const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // deserialize iso8601 strings as dates

    const _pluginSettings: LongformPluginSettings = pick(
      settings,
      TRACKED_SETTINGS_PATHS
    ) as LongformPluginSettings;
    pluginSettings.set(_pluginSettings);
    selectedDraftVaultPath.set(_pluginSettings.selectedDraftVaultPath);
    determineMigrationStatus(_pluginSettings);

    // We load user scripts imperatively first to cover cases where we need to deserialize
    // workflows that may contain them.
    const userScriptFolder = settings["userScriptFolder"];
    this.userScriptObserver = new UserScriptObserver(
      this.app.vault,
      userScriptFolder
    );
    await this.userScriptObserver.loadUserSteps();

    let _workflows = settings["workflows"];

    if (!_workflows) {
      console.log("[Longform] No workflows found; adding default workflow.");
      _workflows = DEFAULT_WORKFLOWS;
    }

    const deserializedWorkflows: Record<string, Workflow> = {};
    Object.entries(_workflows).forEach(([key, value]) => {
      deserializedWorkflows[key as string] = deserializeWorkflow(
        value as SerializedWorkflow
      );
    });
    workflows.set(deserializedWorkflows);

    const onStatusClick = () => {
      const file = get(activeFile);
      if (!file) {
        return false;
      }
      const draft = draftForPath(file.path, get(drafts));
      if (draft) {
        selectedDraftVaultPath.set(draft.vaultPath);
        this.initLeaf();
        const leaf = this.app.workspace
          .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
          .first();
        if (leaf) {
          this.app.workspace.revealLeaf(leaf);
        }

        selectedTab.set("Project");
      }
    };

    this.writingSessionTracker = new WritingSessionTracker(
      settings["sessions"],
      this.addStatusBarItem(),
      onStatusClick,
      this.app.vault
    );
  }

  async saveSettings(): Promise<void> {
    if (!this.cachedSettings) {
      return;
    }

    const _workflows = get(workflows);
    const serializedWorkflows: Record<string, SerializedWorkflow> = {};
    Object.entries(_workflows).forEach(([key, value]) => {
      serializedWorkflows[key as string] = serializeWorkflow(value);
    });

    await this.saveData({
      ...this.cachedSettings,
      workflows: serializedWorkflows,
    });
  }

  private async postLayoutInit(): Promise<void> {
    this.userScriptObserver.beginObserving();

    // Initialize StoreVaultSync with sync awareness
    await this.storeVaultSync.initialize();

    // Continue with the rest of initialization only after sync is complete
    this.watchProjects();
    this.refreshBible();

    const defaultToScenes = once(function (d: Draft) {
      if (d && d.format === "scenes") {
        selectedTab.set("Scenes");
      }
    });

    this.unsubscribeSelectedDraft = selectedDraft.subscribe(async (d) => {
      if (!get(initialized) || !d) {
        return;
      }

      // On initial load, default to Scenes tab for multi-scene projects.
      defaultToScenes(d);

      pluginSettings.update((s) => ({
        ...s,
        selectedDraftVaultPath: d.vaultPath,
      }));
      this.cachedSettings = get(pluginSettings);
      await this.saveSettings();
    });

    // Workflows
    const saveWorkflows = debounce(() => {
      this.saveSettings();
    }, 3000);
    this.unsubscribeWorkflows = workflows.subscribe(() => {
      if (!get(initialized)) {
        return;
      }

      saveWorkflows();
    });

    // Sessions
    const saveSessions = debounce(async (toSave: WordCountSession[]) => {
      if (this.cachedSettings.sessionStorage === "data") {
        pluginSettings.update((s) => {
          const toReturn = {
            ...s,
            sessions: toSave,
          };
          this.cachedSettings = toReturn;
          return toReturn;
        });
        await this.saveSettings();
      } else {
        // Save to either plugin or vault
        let file: string | null = null;
        if (this.cachedSettings.sessionStorage === "plugin-folder") {
          if (!this.manifest.dir) {
            console.error(`[Longform] No manifest.dir for saving sessions.`);
            return;
          }
          file = normalizePath(`${this.manifest.dir}/sessions.json`);
        } else {
          file = this.cachedSettings.sessionFile;
        }
        if (!file) {
          return;
        }
        const data = JSON.stringify(toSave);
        await this.app.vault.adapter.write(file, data);

        // If we have lingering session data in settings, clear it
        if (this.cachedSettings.sessions.length !== 0) {
          const emptySessions: WordCountSession[] = [];
          pluginSettings.update((s) => {
            const toReturn = {
              ...s,
              sessions: emptySessions,
            };
            this.cachedSettings = toReturn;
            return toReturn;
          });
          await this.saveSettings();
        }
      }
    }, 3000);
    this.unsubscribeSessions = sessions.subscribe((s) => {
      if (!get(initialized)) {
        return;
      }

      saveSessions(s);
    });

    this.unsubscribeGoalNotification = derived(
      [goalProgress, pluginSettings, selectedDraft, activeFile],
      (stores) => stores
    ).subscribe(
      ([$goalProgress, $pluginSettings, $selectedDraft, $activeFile]) => {
        if ($goalProgress >= 1 && $pluginSettings.notifyOnGoal) {
          let target: string;
          if ($pluginSettings.applyGoalTo === "all") {
            target = "all";
          } else if ($pluginSettings.applyGoalTo === "project") {
            target = `draft::${$selectedDraft.vaultPath}`;
          } else if ($pluginSettings.applyGoalTo === "note") {
            if ($selectedDraft && $selectedDraft.format === "single") {
              target = `note::${$selectedDraft.vaultPath}`;
            } else if (
              $selectedDraft &&
              $selectedDraft.format === "scenes" &&
              $activeFile
            ) {
              target = `note::${$activeFile.path}`;
            }
          }
          if (
            target &&
            !this.writingSessionTracker.goalsNotifiedFor.has(target)
          ) {
            this.writingSessionTracker.goalsNotifiedFor.add(target);
            new Notice("Writing goal met!");
          }
        }
      }
    );

    this.initLeaf();
    this.ensureNotesLeaf();
    initialized.set(true);
  }

  ensureNotesLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_LONGFORM_NOTES).length) {
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    void leaf
      .setViewState({
        type: VIEW_TYPE_LONGFORM_NOTES,
      })
      .then(() => {
        this.app.workspace.rightSplit.expand();
        this.app.workspace.revealLeaf(leaf);
      });
  }

  async showPrivateComments(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_LONGFORM_NOTES)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({
        type: VIEW_TYPE_LONGFORM_NOTES,
        active: true,
      });
    }
    this.app.workspace.rightSplit.expand();
    this.app.workspace.revealLeaf(leaf);
  }

  initLeaf(): void {
    if (
      this.app.workspace.getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER).length
    ) {
      return;
    }
    this.app.workspace.getLeftLeaf(false).setViewState({
      type: VIEW_TYPE_LONGFORM_EXPLORER,
    });
  }

  private watchProjects(): void {
    // USER SCRIPTS
    this.registerEvent(
      this.app.vault.on(
        "modify",
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)
      )
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, _oldPath) => {
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    // STORE-VAULT SYNC
    this.storeVaultSync.discoverDrafts();

    this.registerEvent(
      this.app.metadataCache.on(
        "changed",
        this.storeVaultSync.fileMetadataChanged.bind(this.storeVaultSync)
      )
    );

    this.registerEvent(
      this.app.vault.on(
        "create",
        this.storeVaultSync.fileCreated.bind(this.storeVaultSync)
      )
    );

    this.registerEvent(
      this.app.vault.on(
        "delete",
        this.storeVaultSync.fileDeleted.bind(this.storeVaultSync)
      )
    );

    this.registerEvent(
      this.app.vault.on(
        "rename",
        this.storeVaultSync.fileRenamed.bind(this.storeVaultSync)
      )
    );

    // WORD COUNTS
    this.registerEvent(
      this.app.vault.on(
        "modify",
        this.writingSessionTracker.fileModified.bind(this.writingSessionTracker)
      )
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.writingSessionTracker.debouncedCountDraftContaining.bind(
          this.writingSessionTracker
        )(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.writingSessionTracker.debouncedCountDraftContaining.bind(
          this.writingSessionTracker
        )(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, _oldPath) => {
        this.writingSessionTracker.debouncedCountDraftContaining.bind(
          this.writingSessionTracker
        )(file);
      })
    );
  }

  private openBibleCard = (event: Event): void => {
    const path = (event as CustomEvent<{ path?: string }>).detail?.path;
    if (!path) {
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      void this.app.workspace.getLeaf(false).openFile(file);
    }
  };

  private refreshBible(): void {
    const cards: BibleCard[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const card = cardFromFrontmatter(
        file.path,
        this.app.metadataCache.getFileCache(file)?.frontmatter
      );
      if (card) {
        cards.push(card);
      }
    }
    bibleCards.set(cards);
  }

  private queuePageStyle(): void {
    this.styleLongformLeaves();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.styleLongformLeaves();
      });
    });
  }

  private styleLongformLeaves(allDrafts: Draft[] = get(drafts)) {
    const modes = pageModeClasses(get(pluginSettings));
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const el = leaf.view.containerEl;
      let pageClassesChanged = false;
      if (leaf.view instanceof FileView && leaf.view.file) {
        const draft = draftForPath(leaf.view.file.path, allDrafts);
        const wantPath = draft ? leaf.view.file.path : "";
        if ((el.dataset.longformPath ?? "") !== wantPath) {
          if (wantPath.length > 0) {
            el.dataset.longformPath = wantPath;
          } else {
            delete el.dataset.longformPath;
          }
          pageClassesChanged = true;
        }
        const wantLeaf = Boolean(draft);
        if (el.classList.contains(LONGFORM_LEAF_CLASS) !== wantLeaf) {
          el.classList.toggle(LONGFORM_LEAF_CLASS, wantLeaf);
          pageClassesChanged = true;
        }
        for (const cls of PAGE_MODE_CLASSES) {
          const want = Boolean(draft) && modes.includes(cls);
          if (el.classList.contains(cls) !== want) {
            el.classList.toggle(cls, want);
            pageClassesChanged = true;
          }
        }
        const pageSettings = get(pluginSettings);
        const contrast = manuscriptContrastClass(
          Boolean(draft) && pageSettings.lightManuscript,
          appColorScheme(el.ownerDocument.body.classList)
        );
        el.classList.toggle(
          MANUSCRIPT_LIGHT_CLASS,
          contrast === MANUSCRIPT_LIGHT_CLASS
        );
        el.classList.toggle(
          MANUSCRIPT_DARK_CLASS,
          contrast === MANUSCRIPT_DARK_CLASS
        );
        const form = pageForm(
          draft
            ? this.app.metadataCache.getFileCache(leaf.view.file)?.frontmatter?.[
                PAGE_FORM_KEY
              ]
            : undefined
        );
        const portuguese = Boolean(draft) && pageSettings.portuguesePage;
        if (el.classList.contains("longform-lang-pt") !== portuguese) {
          el.classList.toggle("longform-lang-pt", portuguese);
          pageClassesChanged = true;
        }
        for (const cls of PAGE_FORM_CLASSES) {
          const want = Boolean(draft) && cls === pageFormClass(form);
          if (el.classList.contains(cls) !== want) {
            el.classList.toggle(cls, want);
            pageClassesChanged = true;
          }
        }
        const measure = draft ? readingMeasureVars(pageSettings) : null;
        el.classList.toggle("longform-measure", Boolean(measure));
        if (measure) {
          for (const [name, value] of Object.entries(measure)) {
            el.style.setProperty(name, value);
          }
        } else {
          for (const name of READING_MEASURE_PROPERTIES) {
            el.style.removeProperty(name);
          }
        }
        syncWritingBar(
          el,
          leaf.view instanceof MarkdownView ? leaf.view : null,
          Boolean(draft)
        );
      }

      if (pageClassesChanged && leaf.view instanceof MarkdownView) {
        const editor = leaf.view.editor as {
          cm?: { dispatch: (spec: { userEvent: string }) => void };
        };
        window.requestAnimationFrame(() => {
          editor.cm?.dispatch({ userEvent: "longform.page" });
        });
      }

      // @ts-ignore
      const leafId = leaf.id;
      if (leafId) {
        leaf.view.containerEl.dataset.leafId = leafId;
      }
    });
  }
}
