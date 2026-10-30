import { TFile } from "obsidian";
import { get } from "svelte/store";

import { besideTargets, type BesideTarget } from "src/model/page-beside";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";
import { BesideModal } from "src/view/BesideModal";
import { openNoteBeside } from "src/view/open-beside";

import type { CommandBuilder } from "./types";

function targetsForActive(pluginApp: ConstructorParameters<typeof BesideModal>[0]): BesideTarget[] | null {
  const file = pluginApp.workspace.getActiveFile();
  if (!(file instanceof TFile)) {
    return null;
  }
  const all = get(drafts);
  const current = draftForPath(file.path, all);
  if (!current) {
    return null;
  }
  const project = all.filter((draft) => draft.title === current.title);
  return besideTargets(file.path, current, file.basename, project);
}

export const openBesidePage: CommandBuilder = (plugin) => ({
  id: "longform-open-beside",
  name: "Open beside this page",
  icon: "columns",
  checkCallback(checking) {
    const targets = targetsForActive(plugin.app);
    if (!targets) {
      return false;
    }
    if (checking) {
      return true;
    }
    new BesideModal(plugin.app, targets, (target) => {
      void openNoteBeside(plugin.app, target.path);
    }).open();
  },
});

export const restoreRecoveredPage: CommandBuilder = (plugin) => ({
  id: "longform-restore-recovered-page",
  name: "Restore recovered page",
  checkCallback(checking) {
    const file = plugin.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || !draftForPath(file.path, get(drafts))) {
      return false;
    }
    if (checking) {
      return true;
    }
    void plugin.pageRecovery.offer(file, true);
  },
});
