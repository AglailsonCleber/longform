import { MarkdownView, Notice, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import {
  CADENCE_KEY,
  DUE_KEY,
  DESK_KEY,
  NARRATOR_KEY,
  COLUMN_SERIES_KEY,
  assignFact,
  assignPersona,
  assignVehicleCeiling,
  chronicleFromFrontmatter,
  linkVersions,
  parseCadence,
  parseCeilingUnit,
  preserveFirstPublication,
  setRealPeople,
  type Cadence,
  type CeilingUnit,
  type Persona,
} from "src/model/chronicle";
import { craftTick } from "src/model/craft-store";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";
import { AskTextModal } from "src/view/revision/revision-modals";

import type { CommandBuilder } from "./types";

function activeFile(app: App): TFile | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view?.file || !draftForPath(view.file.path, get(drafts))) {
    return null;
  }
  return view.file;
}

export function setColumnCadence(app: App, cadence?: Cadence): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const run = (value: Cadence) => {
    void app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[CADENCE_KEY] = value;
    });
    craftTick.update((tick) => tick + 1);
    new Notice(`Column cadence: ${value}.`);
  };
  if (cadence) {
    run(cadence);
    return;
  }
  new AskTextModal(app, "Column cadence", "weekly | biweekly | once", (value) => {
    const parsed = parseCadence(value);
    if (!parsed) {
      new Notice("Unknown cadence.");
      return;
    }
    run(parsed);
  }).open();
}

export function setVehicleCeiling(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  new AskTextModal(app, "Vehicle ceiling amount", "800", (amountValue) => {
    const amount = Number(amountValue);
    if (!amount || amount <= 0) {
      return;
    }
    new AskTextModal(
      app,
      "Unit",
      "words | chars | pages",
      (unitValue) => {
        const unit = parseCeilingUnit(unitValue) as CeilingUnit;
        void app.fileManager.processFrontMatter(file, (frontmatter) => {
          assignVehicleCeiling(frontmatter, amount, unit);
        });
        craftTick.update((tick) => tick + 1);
        new Notice(`Vehicle ceiling: ${amount} ${unit}.`);
      }
    ).open();
  }).open();
}

export function setDeliveryDue(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  new AskTextModal(app, "Delivery due date", "2026-11-10", (value) => {
    void app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (value.trim()) {
        frontmatter[DUE_KEY] = value.trim();
      } else {
        delete frontmatter[DUE_KEY];
      }
    });
    craftTick.update((tick) => tick + 1);
    new Notice("Delivery due kept — separate from today’s word goal.");
  }).open();
}

export function editPersona(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const current = chronicleFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  ).persona;
  new AskTextModal(app, "Persona tone", current.tone || "wry, local", (tone) => {
    new AskTextModal(
      app,
      "How the column addresses the reader",
      current.address || "você",
      (address) => {
        new AskTextModal(
          app,
          "What this narrator notices",
          current.notices || "street detail, small ironies",
          (notices) => {
            const persona: Persona = {
              tone: tone.trim(),
              address: address.trim(),
              notices: notices.trim(),
            };
            void app.fileManager.processFrontMatter(file, (frontmatter) => {
              assignPersona(frontmatter, persona);
            });
            craftTick.update((tick) => tick + 1);
            new Notice("Column persona kept.");
          }
        ).open();
      }
    ).open();
  }).open();
}

export function editFactSheet(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const fact = chronicleFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  ).fact;
  new AskTextModal(app, "Fact date", fact.date || "2026-11-04", (date) => {
    new AskTextModal(app, "Fact place", fact.place || "downtown", (place) => {
      new AskTextModal(
        app,
        "What was seen",
        fact.seen || "the queue at the stop",
        (seen) => {
          new AskTextModal(
            app,
            "What was invented on top of the seen",
            fact.invented || "the overheard confession",
            (invented) => {
              void app.fileManager.processFrontMatter(file, (frontmatter) => {
                assignFact(frontmatter, {
                  date: date.trim(),
                  place: place.trim(),
                  seen: seen.trim(),
                  invented: invented.trim(),
                });
              });
              craftTick.update((tick) => tick + 1);
              new Notice("Fact sheet kept.");
            }
          ).open();
        }
      ).open();
    }).open();
  }).open();
}

export function linkPaperAndBook(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const sheet = chronicleFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  );
  new AskTextModal(
    app,
    "Paper version path",
    sheet.paperVersion || file.path,
    (paper) => {
      new AskTextModal(
        app,
        "Book version path",
        sheet.bookVersion || "",
        (book) => {
          void app.fileManager.processFrontMatter(file, (frontmatter) => {
            linkVersions(frontmatter, paper, book);
          });
          craftTick.update((tick) => tick + 1);
          new Notice("Paper and book versions linked.");
        }
      ).open();
    }
  ).open();
}

export function recordPublication(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  new AskTextModal(app, "Publication date", "2026-11-04", (published) => {
    new AskTextModal(app, "Venue", "Folha · cotidianas", (venue) => {
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        preserveFirstPublication(frontmatter, published, venue);
      });
      craftTick.update((tick) => tick + 1);
      new Notice("Publication recorded. First date stays if already set.");
    }).open();
  }).open();
}

export function markRealPeople(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  const current = chronicleFromFrontmatter(
    app.metadataCache.getFileCache(file)?.frontmatter
  ).realPeople;
  new AskTextModal(
    app,
    "Real people to check before sending",
    current.join(", ") || "Maria, the mayor",
    (value) => {
      const names = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        setRealPeople(frontmatter, names);
      });
      craftTick.update((tick) => tick + 1);
      new Notice("Real-people marks kept for a careful reading.");
    }
  ).open();
}

export function setRecurringNarrator(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  new AskTextModal(
    app,
    "Recurring narrator",
    "the columnist on the tram",
    (value) => {
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (value.trim()) {
          frontmatter[NARRATOR_KEY] = value.trim();
        } else {
          delete frontmatter[NARRATOR_KEY];
        }
      });
      craftTick.update((tick) => tick + 1);
      new Notice("Recurring narrator kept — no romance climax required.");
    }
  ).open();
}

export function setSeriesAndDesk(app: App): void {
  const file = activeFile(app);
  if (!file) {
    return;
  }
  new AskTextModal(app, "Column series name", "Segundas na esquina", (series) => {
    new AskTextModal(app, "Desk / section", "cotidiano", (desk) => {
      void app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (series.trim()) {
          frontmatter[COLUMN_SERIES_KEY] = series.trim();
        } else {
          delete frontmatter[COLUMN_SERIES_KEY];
        }
        if (desk.trim()) {
          frontmatter[DESK_KEY] = desk.trim();
        } else {
          delete frontmatter[DESK_KEY];
        }
      });
      craftTick.update((tick) => tick + 1);
      new Notice("Series and desk kept.");
    }).open();
  }).open();
}

export const setColumnCadenceCommand: CommandBuilder = (plugin) => ({
  id: "longform-column-cadence",
  name: "Set column cadence",
  callback: () => {
    setColumnCadence(plugin.app);
  },
});

export const setVehicleCeilingCommand: CommandBuilder = (plugin) => ({
  id: "longform-vehicle-ceiling",
  name: "Set vehicle ceiling",
  callback: () => {
    setVehicleCeiling(plugin.app);
  },
});

export const setDeliveryDueCommand: CommandBuilder = (plugin) => ({
  id: "longform-delivery-due",
  name: "Set delivery due date",
  callback: () => {
    setDeliveryDue(plugin.app);
  },
});

export const editPersonaCommand: CommandBuilder = (plugin) => ({
  id: "longform-column-persona",
  name: "Edit column persona",
  callback: () => {
    editPersona(plugin.app);
  },
});

export const editFactSheetCommand: CommandBuilder = (plugin) => ({
  id: "longform-fact-sheet",
  name: "Edit chronicle fact sheet",
  callback: () => {
    editFactSheet(plugin.app);
  },
});

export const markRealPeopleCommand: CommandBuilder = (plugin) => ({
  id: "longform-mark-real-people",
  name: "Mark real people to check",
  callback: () => {
    markRealPeople(plugin.app);
  },
});
