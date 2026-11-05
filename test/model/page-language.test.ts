import { describe, expect, it } from "vitest";

import {
  matchSpellLanguage,
  normalizePageLanguage,
  savedPageLanguage,
  speechLanguage,
} from "src/model/page-language";

describe("page language", () => {
  it("keeps a chosen tag and treats Off as unmarked", () => {
    expect(normalizePageLanguage("pt-pt")).toBe("pt-PT");
    expect(normalizePageLanguage("en_US")).toBe("en-US");
    expect(normalizePageLanguage("off")).toBe("");
    expect(normalizePageLanguage("")).toBe("");
    expect(normalizePageLanguage("not a language")).toBe("pt-BR");
  });

  it("reads the old Portuguese page toggle when no language was saved", () => {
    expect(savedPageLanguage(null)).toBe("pt-BR");
    expect(savedPageLanguage({ portuguesePage: true })).toBe("pt-BR");
    expect(savedPageLanguage({ portuguesePage: false })).toBe("");
    expect(savedPageLanguage({ portuguesePage: false, pageLanguage: "es" })).toBe("es");
  });

  it("picks the installed dictionary for the chosen language", () => {
    const available = ["en-US", "pt-BR", "fr"];
    expect(matchSpellLanguage("pt-PT", available)).toBe("pt-BR");
    expect(matchSpellLanguage("en", available)).toBe("en-US");
    expect(matchSpellLanguage("de", available)).toBeNull();
    expect(matchSpellLanguage("", available)).toBeNull();
  });

  it("speaks the page language, and Portuguese when the page is unmarked", () => {
    expect(speechLanguage("fr")).toBe("fr");
    expect(speechLanguage("")).toBe("pt-BR");
    expect(speechLanguage(undefined)).toBe("pt-BR");
  });
});
