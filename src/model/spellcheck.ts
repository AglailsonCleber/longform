type SpellSession = {
  availableSpellCheckerLanguages?: string[];
  getSpellCheckerLanguages?: () => string[];
  setSpellCheckerLanguages?: (languages: string[]) => void;
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

function portugueseLanguage(available: string[]): string | null {
  const names = available.map((language) => language.toLowerCase());
  const ptBr = names.findIndex((language) => language === "pt-br");
  if (ptBr >= 0) {
    return available[ptBr];
  }
  const pt = names.findIndex((language) => language.startsWith("pt"));
  return pt >= 0 ? available[pt] : null;
}

/**
 * Asks the desktop spell checker for Portuguese while the page setting is on.
 * The previous language list is put back when the setting is turned off.
 */
export function applyPortugueseSpellcheck(enabled: boolean): void {
  const session = spellSession();
  if (
    !session?.setSpellCheckerLanguages ||
    !session.getSpellCheckerLanguages ||
    !session.availableSpellCheckerLanguages
  ) {
    return;
  }

  if (!enabled) {
    if (previousLanguages) {
      session.setSpellCheckerLanguages(previousLanguages);
      previousLanguages = null;
    }
    return;
  }

  const portuguese = portugueseLanguage(session.availableSpellCheckerLanguages);
  if (!portuguese) {
    return;
  }
  if (!previousLanguages) {
    previousLanguages = session.getSpellCheckerLanguages();
  }
  session.setSpellCheckerLanguages([portuguese]);
}
