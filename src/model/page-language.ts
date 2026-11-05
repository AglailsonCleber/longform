export type PageLanguageOption = {
  id: string;
  label: string;
};

/** Languages offered on the writing page. Empty id leaves the page unmarked. */
export const PAGE_LANGUAGE_OPTIONS: PageLanguageOption[] = [
  { id: "", label: "Off" },
  { id: "pt-BR", label: "Portuguese (Brazil)" },
  { id: "pt-PT", label: "Portuguese (Portugal)" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "it", label: "Italian" },
  { id: "de", label: "German" },
];

const REGION = /^[a-z]{2}$/i;
const SCRIPT = /^[a-z]{4}$/i;

/**
 * A BCP 47 tag the page can store, or "" for Off.
 * An unknown shape falls back to Brazilian Portuguese, the previous default.
 */
export function normalizePageLanguage(value: unknown): string {
  if (typeof value !== "string") {
    return "pt-BR";
  }
  const trimmed = value.trim().replace(/_/g, "-");
  if (trimmed === "" || trimmed.toLowerCase() === "off") {
    return "";
  }
  const parts = trimmed.split("-").filter((part) => part.length > 0);
  if (parts.length === 0 || !/^[a-z]{2,3}$/i.test(parts[0])) {
    return "pt-BR";
  }
  const language = parts[0].toLowerCase();
  const rest = parts.slice(1).map((part) => {
    if (REGION.test(part)) {
      return part.toUpperCase();
    }
    if (SCRIPT.test(part)) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
    return part.toLowerCase();
  });
  return [language].concat(rest).join("-");
}

/**
 * Language saved before `pageLanguage` existed.
 * The old toggle on meant pt-BR. Off stays unmarked.
 */
export function savedPageLanguage(raw: Record<string, unknown> | null): string {
  if (raw && typeof raw.pageLanguage === "string") {
    return normalizePageLanguage(raw.pageLanguage);
  }
  if (raw && raw.portuguesePage === false) {
    return "";
  }
  return "pt-BR";
}

export function catalogLanguage(value: string): boolean {
  const key = value.trim().toLowerCase();
  for (const option of PAGE_LANGUAGE_OPTIONS) {
    if (option.id.length > 0 && option.id.toLowerCase() === key) {
      return true;
    }
  }
  return false;
}

/** Dictation and read-aloud keep Portuguese when the page is unmarked. */
export function speechLanguage(pageLanguage: string | null | undefined): string {
  const language = normalizePageLanguage(pageLanguage ?? "pt-BR");
  return language || "pt-BR";
}

/**
 * The installed spell-checker tag closest to the page language.
 * Prefers an exact tag, then the same language with any region.
 */
export function matchSpellLanguage(
  requested: string,
  available: string[]
): string | null {
  const want = requested.trim().toLowerCase().replace(/_/g, "-");
  if (!want) {
    return null;
  }
  const names = available.map((language) => language.toLowerCase().replace(/_/g, "-"));
  const exact = names.indexOf(want);
  if (exact >= 0) {
    return available[exact];
  }
  const base = want.split("-")[0];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (name === base || name.indexOf(base + "-") === 0) {
      return available[index];
    }
  }
  return null;
}
