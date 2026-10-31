import { writable } from "svelte/store";

import type { BibleCard } from "./bible";

export const bibleCards = writable<BibleCard[]>([]);
