import { matchSpellLanguage } from "./page-language";

type SpellSession = {
  availableSpellCheckerLanguages?: string[];
  getSpellCheckerLanguages?: () => string[];
  setSpellCheckerLanguages?: (languages: string[]) => void;
  addWordToSpellCheckerDictionary?: (word: string) => void;
  removeWordFromSpellCheckerDictionary?: (word: string) => void;
};

let previousLanguages: string[] | null = null;

function spellSession(): SpellSession | null {
  const holder = globalThis as { require?: (id: string) => { session?: SpellSession; remote?: { session?: SpellSession } } };
  if (!holder.require) {
    return null;
  }
  try {
    const electron = holder.require("elec" + "tron");
    return electron?.remote?.session ?? electron?.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Asks the desktop spell checker for the page language.
 * An empty language puts the previous list back.
 * A language with no installed dictionary leaves the checker alone.
 */
export function applyPageSpellcheck(language: string): void {
  const session = spellSession();
  if (
    !session?.setSpellCheckerLanguages ||
    !session.getSpellCheckerLanguages ||
    !session.availableSpellCheckerLanguages
  ) {
    return;
  }

  if (!language) {
    if (previousLanguages) {
      session.setSpellCheckerLanguages(previousLanguages);
      previousLanguages = null;
    }
    return;
  }

  const matched = matchSpellLanguage(language, session.availableSpellCheckerLanguages);
  if (!matched) {
    return;
  }
  if (!previousLanguages) {
    previousLanguages = session.getSpellCheckerLanguages();
  }
  session.setSpellCheckerLanguages([matched]);
}

let managedWords: string[] = [];

/** Teach the desktop spell checker the book's names and neologisms, and take them back when the book changes. */
export function syncBookDictionary(words: string[]): void {
  const session = spellSession();
  const add = session?.addWordToSpellCheckerDictionary;
  const remove = session?.removeWordFromSpellCheckerDictionary;
  if (!add) {
    managedWords = words.slice();
    return;
  }
  for (const word of managedWords) {
    if (words.indexOf(word) < 0 && remove) {
      remove(word);
    }
  }
  for (const word of words) {
    add(word);
  }
  managedWords = words.slice();
}

export function clearBookDictionary(): void {
  syncBookDictionary([]);
}
