import { writable } from "svelte/store";

import { DEFAULT_SOUND_LAYERS, type SoundLayers } from "./verse";

export const craftTick = writable(0);
export const soundLayers = writable<SoundLayers>({ ...DEFAULT_SOUND_LAYERS });
export const verseMode = writable<"classical" | "phonetic">("classical");
