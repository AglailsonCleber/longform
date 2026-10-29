import { Notice } from "obsidian";

import { pluginSettings } from "src/model/stores";
import type { PageModeSettings } from "src/view/page-mode";

import type { CommandBuilder } from "./types";

function togglePageMode(
  key: keyof PageModeSettings,
  name: string
): CommandBuilder {
  return () => ({
    id: `longform-toggle-${key}`,
    name,
    callback: () => {
      let enabled = false;
      pluginSettings.update((settings) => {
        enabled = !settings[key];
        return { ...settings, [key]: enabled };
      });
      new Notice(`Longform: ${name} ${enabled ? "on" : "off"}`);
    },
  });
}

export const toggleHighlightCurrentLine = togglePageMode(
  "highlightCurrentLine",
  "Toggle current line highlight"
);

export const toggleFocusMode = togglePageMode(
  "focusMode",
  "Toggle focus mode"
);

export const toggleTypewriterMode = togglePageMode(
  "typewriterMode",
  "Toggle typewriter mode"
);
