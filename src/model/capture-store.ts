import { writable } from "svelte/store";

import type { CaptureNote } from "./capture";

export const captures = writable<CaptureNote[]>([]);
