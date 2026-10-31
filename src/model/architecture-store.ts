import { writable } from "svelte/store";

/** Bumped when note metadata changes, so structure cards reread the scenes. */
export const structureRevision = writable(0);
