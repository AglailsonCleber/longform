import { Notice, type MarkdownFileInfo, type MarkdownView } from "obsidian";
import { get } from "svelte/store";

import {
  spokenUnits,
  spokenUnitsFromLine,
  type SpokenUnit,
} from "src/model/read-aloud";
import { draftForPath } from "src/model/scene-navigation";
import { drafts } from "src/model/stores";

import type { CommandBuilder } from "./types";

function isLongformFile(view: MarkdownView | MarkdownFileInfo): boolean {
  const path = view.file?.path;
  if (!path) {
    return false;
  }
  return draftForPath(path, get(drafts)) !== null;
}

const player = {
  token: 0,
  timer: 0,
  stop(): void {
    this.token += 1;
    window.clearTimeout(this.timer);
    window.speechSynthesis?.cancel();
  },
};

function portugueseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const language = (voice: SpeechSynthesisVoice) =>
    voice.lang.toLowerCase().replace("_", "-");
  return (
    voices.find((voice) => language(voice).startsWith("pt-br")) ??
    voices.find((voice) => language(voice).startsWith("pt"))
  );
}

function whenVoicesReady(run: () => void): void {
  if (window.speechSynthesis.getVoices().length > 0) {
    run();
    return;
  }
  const start = () => {
    window.speechSynthesis.removeEventListener("voiceschanged", start);
    run();
  };
  window.speechSynthesis.addEventListener("voiceschanged", start);
  window.speechSynthesis.getVoices();
}

function speak(units: SpokenUnit[]): void {
  player.stop();
  const token = player.token;
  const step = (index: number) => {
    if (token !== player.token || index >= units.length) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(units[index].text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    const voice = portugueseVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => {
      if (token !== player.token) {
        return;
      }
      player.timer = window.setTimeout(
        () => step(index + 1),
        units[index].pauseAfter
      );
    };
    window.speechSynthesis.speak(utterance);
  };
  whenVoicesReady(() => step(0));
}

export const readAloud: CommandBuilder = () => ({
  id: "longform-read-aloud",
  name: "Read aloud",
  editorCheckCallback(checking, editor, view) {
    if (!isLongformFile(view)) {
      return false;
    }
    if (checking) {
      return true;
    }
    if (!window.speechSynthesis) {
      new Notice("This computer has no voice for reading aloud.");
      return;
    }

    const selected = editor.getSelection();
    const units =
      selected.length > 0
        ? spokenUnits(selected)
        : spokenUnitsFromLine(spokenUnits(editor.getValue()), editor.getCursor().line);
    if (units.length === 0) {
      new Notice("Nothing to read.");
      return;
    }
    speak(units);
  },
});

export const stopReading: CommandBuilder = () => ({
  id: "longform-stop-reading",
  name: "Stop reading",
  callback: () => {
    player.stop();
  },
});
