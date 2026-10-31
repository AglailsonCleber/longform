import { MarkdownView, Notice, type App } from "obsidian";

import { captureFolder, createCapture } from "./capture-files";
import type { Draft } from "src/model/types";

type SpeechResult = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

let active: SpeechRecognizer | null = null;

function recognizer(): SpeechRecognizer | null {
  const holder = window as {
    SpeechRecognition?: new () => SpeechRecognizer;
    webkitSpeechRecognition?: new () => SpeechRecognizer;
  };
  const Ctor = holder.SpeechRecognition ?? holder.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function stopDictation(): void {
  active?.stop();
  active = null;
}

/** Speaks into a raw note. The open scene is left untouched. */
export async function startDictation(app: App, draft: Draft | null): Promise<void> {
  stopDictation();
  const project = draft?.title ?? "";
  const folder = draft ? captureFolder(draft) : "Captura";
  const file = await createCapture(
    app,
    {
      kind: "dictation",
      project,
      text: "",
    },
    folder
  );
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file);
  const heard = recognizer();
  if (!heard) {
    new Notice("This computer has no speech recognition. The raw draft is ready to type.");
    return;
  }
  heard.lang = "pt-BR";
  heard.continuous = true;
  heard.interimResults = false;
  heard.onresult = (event) => {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file?.path !== file.path) {
      return;
    }
    let said = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) {
        said += result[0].transcript;
      }
    }
    const line = said.trim();
    if (line.length > 0) {
      view.editor.replaceRange(`\n${line}\n`, { line: view.editor.lastLine(), ch: view.editor.getLine(view.editor.lastLine()).length });
    }
  };
  heard.onerror = () => {
    new Notice("Dictation stopped.");
    active = null;
  };
  heard.start();
  active = heard;
  new Notice("Dictation is going into a raw draft, not the manuscript.");
}
