import { writable } from "svelte/store";

import { DEFAULT_PROSE, type ProseToggles } from "./revision";

export const revisionTick = writable(0);
export const proseToggles = writable<ProseToggles>({ ...DEFAULT_PROSE });
export const readerPaths = writable<string[]>([]);
