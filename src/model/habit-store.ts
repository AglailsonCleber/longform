import { writable } from "svelte/store";

import type { Sprint } from "./habit";

export const habitTick = writable(0);
export const writingSeconds = writable(0);
export const sprint = writable<Sprint | null>(null);

export type SessionBaseline = {
  path: string;
  lines: number;
  stanzas: number;
  words: number;
};

export const sessionBaseline = writable<SessionBaseline | null>(null);
