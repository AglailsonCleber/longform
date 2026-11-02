import { describe, expect, it } from "vitest";

import {
  bookDictionary,
  folderOutsideVault,
  searchPieces,
  syllablesInText,
  syllablesInWord,
  wordsIn,
} from "src/model/archive";
import { openArchive, sealArchive } from "src/model/archive-crypto";
import { readSuggestionReply } from "src/model/suggestion";

describe("archive", () => {
  it("learns names and places and keeps a neologism once", () => {
    expect(wordsIn({ "longform-words": ["sonâmbula", "  ", 3] })).toEqual(["sonâmbula"]);
    expect(
      bookDictionary(["sonâmbula", "Sonâmbula"], [["Maria Silva"], ["Rio de Janeiro"]])
    ).toEqual(["sonâmbula", "Maria", "Silva", "Rio", "Janeiro"]);
  });

  it("searches the prose, the comment, the card, and the research", () => {
    const hits = searchPieces(
      [
        {
          path: "Livro/Cena.md",
          kind: "scene",
          text: "A casa\n%%? quem chegou %%\n",
        },
        { path: "Fichas/Maria.md", kind: "card", text: "names:\n  - Maria\n" },
        { path: "Pesquisa/Rua.md", kind: "research", text: "A rua era larga.\n" },
      ],
      "casa"
    );
    expect(hits.map((hit) => hit.kind)).toEqual(["text"]);
    const comment = searchPieces(
      [{ path: "Livro/Cena.md", kind: "scene", text: "A casa\n%% quem chegou %%\n" }],
      "quem"
    );
    expect(comment.map((hit) => hit.kind)).toEqual(["comment"]);
    const card = searchPieces(
      [{ path: "Fichas/Maria.md", kind: "card", text: "names:\n  - Maria\n" }],
      "maria"
    );
    expect(card[0].kind).toBe("card");
    const research = searchPieces(
      [{ path: "Pesquisa/Rua.md", kind: "research", text: "A rua era larga.\n" }],
      "rua"
    );
    expect(research[0].kind).toBe("research");
  });

  it("counts Portuguese vowel groups", () => {
    expect(syllablesInWord("casa")).toBe(2);
    expect(syllablesInWord("poeta")).toBe(3);
    expect(syllablesInWord("saúde")).toBe(3);
    expect(syllablesInWord("pão")).toBe(1);
    expect(syllablesInWord("que")).toBe(1);
    expect(syllablesInWord("água")).toBe(2);
    expect(syllablesInWord("ideia")).toBe(3);
    expect(syllablesInWord("muito")).toBe(2);
    expect(syllablesInText("A casa")).toBe(3);
  });

  it("keeps a copy outside the vault", () => {
    expect(folderOutsideVault("C:/Archive", "C:/Vault")).toBe(true);
    expect(folderOutsideVault("C:/Vault/Backup", "C:/Vault")).toBe(false);
    expect(folderOutsideVault("C:/Vault", "C:/Vault")).toBe(false);
  });

  it("opens an encrypted copy with the same passphrase", async () => {
    const sealed = await sealArchive(
      [{ path: "Livro/Cena.md", text: "A casa" }],
      "segredo",
      1000
    );
    expect(sealed?.format).toBe("longform-archive-v1");
    const opened = sealed ? await openArchive(sealed, "segredo") : null;
    expect(opened).toEqual([{ path: "Livro/Cena.md", text: "A casa" }]);
    expect(sealed ? await openArchive(sealed, "outra") : null).toBeNull();
  });

  it("reads a suggestion without treating it as the manuscript", () => {
    expect(
      readSuggestionReply({ choices: [{ message: { content: " A frase pede um corte. " } }] })
    ).toBe("A frase pede um corte.");
    expect(readSuggestionReply({ response: "Eco de casa." })).toBe("Eco de casa.");
    expect(readSuggestionReply({})).toBeNull();
  });
});
