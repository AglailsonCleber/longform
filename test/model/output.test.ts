import { describe, expect, it } from "vitest";

import {
  bookOpeningMarkdown,
  formatSceneBody,
  joinScenes,
  markdownFromDocx,
  openingFromFrontmatter,
  paragraphsFromDocx,
  printPages,
  scenesFromScrivx,
  toDocx,
  toHtml,
  toPlainText,
  toPdf,
} from "src/model/output";

describe("output", () => {
  it("builds an opening outside the scenes", () => {
    const opening = openingFromFrontmatter("A casa", {
      "longform-author": "Ana",
      "longform-dedication": "Para J.",
      "longform-epigraph": "A rua era larga.",
      "longform-epigraph-source": "Caderno",
    });
    const markdown = bookOpeningMarkdown(opening, ["Um", "Dois"]);
    expect(markdown).toContain("# A casa");
    expect(markdown).toContain("Para J.");
    expect(markdown).toContain("A rua era larga.");
    expect(markdown).toContain("- Um");
  });

  it("joins scenes with a title, an asterism, or nothing", () => {
    const scenes = [
      { title: "Um", text: "A casa.", form: "prose" as const, when: "", indent: 0 },
      { title: "Dois", text: "A rua.", form: "prose" as const, when: "", indent: 0 },
    ];
    expect(joinScenes(scenes, "title")).toContain("# Um");
    expect(joinScenes(scenes, "asterism")).toContain("* * *");
    expect(joinScenes(scenes, "none")).not.toContain("# Um");
  });

  it("shapes the body by form", () => {
    expect(
      formatSceneBody({
        title: "V",
        text: "linha um\nlinha dois",
        form: "verse",
        when: "",
        indent: 0,
      })
    ).toBe("linha um\nlinha dois");
    expect(
      formatSceneBody({
        title: "C",
        text: "A casa\nera azul.",
        form: "prose",
        when: "",
        indent: 0,
      })
    ).toBe("A casa era azul.");
    expect(
      formatSceneBody({
        title: "Crônica",
        text: "Choveu.",
        form: "chronicle",
        when: "12 de março",
        indent: 0,
      })
    ).toContain("12 de março");
  });

  it("writes several formats from the same text", () => {
    const markdown = "# Um\n\nA casa.\n\nverso um\nverso dois";
    expect(toPlainText(markdown)).toContain("A casa.");
    expect(toHtml(markdown, { title: "Livro" })).toContain("<h1>Um</h1>");
    expect(toHtml(markdown, { title: "Livro" })).toContain("longform-verse");
    const docx = toDocx(markdown);
    expect(docx[0]).toBe(0x50);
    expect(paragraphsFromDocx(docx).join(" ")).toContain("A casa.");
    expect(markdownFromDocx(docx)).toContain("A casa.");
    const pdf = toPdf(markdown, "Livro");
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(printPages(markdown).length).toBeGreaterThan(0);
  });

  it("reads binder titles from a Scrivener project", () => {
    const xml = `<ScrivenerProject><Binder>
      <BinderItem UUID="AAA" Type="Text"><Title>Um</Title></BinderItem>
      <BinderItem UUID="BBB" Type="Text"><Title>Dois</Title></BinderItem>
    </Binder></ScrivenerProject>`;
    const scenes = scenesFromScrivx(xml, { AAA: "A casa.", BBB: "A rua." });
    expect(scenes.map((scene) => scene.title)).toEqual(["Um", "Dois"]);
    expect(scenes[0].text).toBe("A casa.");
  });
});
