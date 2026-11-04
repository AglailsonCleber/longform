import { Notice, TFile, normalizePath } from "obsidian";

import { epubFiles, zipStore } from "src/model/literary";
import {
  extensionFor,
  toDocx,
  toHtml,
  toPdf,
  toPlainText,
  type ExportFormat,
} from "src/model/output";
import type { CompileContext, CompileManuscriptInput } from "..";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
} from "./abstract-compile-step";

function parseFormat(value: string): ExportFormat {
  const format = value.trim().toLocaleLowerCase("pt-BR");
  if (
    format === "text" ||
    format === "txt" ||
    format === "html" ||
    format === "epub" ||
    format === "docx" ||
    format === "pdf" ||
    format === "markdown" ||
    format === "md"
  ) {
    if (format === "txt") {
      return "text";
    }
    if (format === "md") {
      return "markdown";
    }
    return format as ExportFormat;
  }
  return "markdown";
}

function resolveTarget(projectPath: string, target: string, title: string): string {
  let path = target.replace(/\$1/g, title);
  if (!path || path.length === 0) {
    throw new Error("Invalid path for Export File.");
  }
  if (path.startsWith("/")) {
    return normalizePath(path.slice(1));
  }
  return normalizePath(`${projectPath}/${path}`);
}

async function ensureFolder(app: CompileContext["app"], filePath: string): Promise<void> {
  const parts = filePath.split("/");
  if (parts.length < 2) {
    return;
  }
  try {
    await app.vault.createFolder(parts.slice(0, -1).join("/"));
  } catch {
    // Folder already existed.
  }
}

export const ExportFileStep = makeBuiltinStep({
  id: "export-file",
  description: {
    name: "Export File",
    description:
      "Writes the manuscript as Markdown, plain text, HTML, EPUB, DOCX, or PDF. Same project, several formats.",
    availableKinds: [CompileStepKind.Manuscript],
    options: [
      {
        id: "format",
        name: "Format",
        description: 'One of: markdown, text, html, epub, docx, pdf.',
        type: CompileStepOptionType.Text,
        default: "markdown",
      },
      {
        id: "target",
        name: "Output path",
        description:
          "Path for the file. Paths starting with / are from the vault root. $1 is the project title.",
        type: CompileStepOptionType.Text,
        default: "Output/$1.md",
      },
      {
        id: "open-after",
        name: "Open after export",
        description: "Open the file when Obsidian can show it.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
      {
        id: "double-space",
        name: "Double space HTML",
        description: "For publisher-style HTML only.",
        type: CompileStepOptionType.Boolean,
        default: false,
      },
    ],
  },
  async compile(input: CompileManuscriptInput, context: CompileContext) {
    const format = parseFormat(String(context.optionValues["format"] ?? "markdown"));
    let target = String(context.optionValues["target"] ?? `Output/$1.${extensionFor(format)}`);
    if (!/\.[A-Za-z0-9]+$/.test(target)) {
      target = `${target}.${extensionFor(format)}`;
    }
    const filePath = resolveTarget(context.projectPath, target, context.draft.title);
    await ensureFolder(context.app, filePath);
    const openAfter = context.optionValues["open-after"] as boolean;
    const doubleSpace = context.optionValues["double-space"] as boolean;

    if (format === "markdown") {
      await context.app.vault.adapter.write(filePath, input.contents);
    } else if (format === "text") {
      await context.app.vault.adapter.write(filePath, toPlainText(input.contents));
    } else if (format === "html") {
      await context.app.vault.adapter.write(
        filePath,
        toHtml(input.contents, {
          title: context.draft.title,
          doubleSpace,
        })
      );
    } else if (format === "docx") {
      const bytes = toDocx(input.contents);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      await context.app.vault.adapter.writeBinary(filePath, copy.buffer);
    } else if (format === "pdf") {
      const bytes = toPdf(input.contents, context.draft.title);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      await context.app.vault.adapter.writeBinary(filePath, copy.buffer);
    } else if (format === "epub") {
      const files = epubFiles(context.draft.title, context.draft.title, [
        { title: context.draft.title, text: input.contents },
      ]);
      const zip = zipStore(files);
      const copy = new Uint8Array(zip.byteLength);
      copy.set(zip);
      await context.app.vault.adapter.writeBinary(filePath, copy.buffer);
    }

    new Notice(`Exported ${filePath}`);
    if (openAfter && (format === "markdown" || format === "html" || format === "text")) {
      const file = context.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        void context.app.workspace.getLeaf(true).openFile(file);
      }
    }
    return input;
  },
});
