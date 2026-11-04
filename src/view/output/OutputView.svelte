<script lang="ts">
  import {
    editOpening,
    ensureProfessionalWorkflows,
    exportProjectFormat,
    importDocxFile,
    importMarkdownFolder,
    importScrivener,
    showPrintPreview,
  } from "src/commands/output";
  import {
    openingFromFrontmatter,
    type ExportFormat,
    type SceneSeparatorKind,
  } from "src/model/output";
  import { selectedDraft, workflows } from "src/model/stores";
  import { TFile } from "obsidian";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let separator: SceneSeparatorKind = "title";

  $: opening = (() => {
    const draft = $selectedDraft;
    if (!draft) {
      return null;
    }
    const index = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (!(index instanceof TFile)) {
      return null;
    }
    return openingFromFrontmatter(
      draft.title,
      app.metadataCache.getFileCache(index)?.frontmatter
    );
  })();

  $: hasPublisher = Boolean($workflows["Publisher Manuscript"]);
  $: hasReading = Boolean($workflows["Reading Book"]);

  const formats: { id: ExportFormat; label: string }[] = [
    { id: "markdown", label: "Markdown" },
    { id: "text", label: "Plain text" },
    { id: "html", label: "HTML" },
    { id: "epub", label: "EPUB" },
    { id: "docx", label: "DOCX" },
    { id: "pdf", label: "PDF" },
  ];
</script>

<div class="longform-output">
  <h3>Output</h3>
  <p class="longform-output-muted">
    A publisher manuscript and a book to read are different exits. Poetry, story, and chronicle keep their own shape.
  </p>

  <h4>Book opening</h4>
  <p class="longform-output-muted">
    Title page, dedication, epigraph, and contents sit outside the scene list.
  </p>
  {#if opening}
    <p class="longform-output-muted">
      {opening.author || "No author yet"}
      {#if opening.dedication} · dedication set{/if}
      {#if opening.epigraph} · epigraph set{/if}
    </p>
  {/if}
  <button type="button" on:click={() => editOpening(app)}>Edit opening</button>

  <h4>Between scenes</h4>
  <div class="longform-output-actions">
    <button type="button" class:selected={separator === "title"} on:click={() => (separator = "title")}
      >Chapter title</button
    >
    <button
      type="button"
      class:selected={separator === "asterism"}
      on:click={() => (separator = "asterism")}>Asterism</button
    >
    <button type="button" class:selected={separator === "none"} on:click={() => (separator = "none")}
      >Nothing</button
    >
  </div>
  <p class="longform-output-muted">
    Used when you export from this tab. Compile workflows can set the same choice in Join Scenes.
  </p>

  <h4>Formats</h4>
  <div class="longform-output-actions">
    {#each formats as format (format.id)}
      <button type="button" on:click={() => void exportProjectFormat(app, format.id, separator)}
        >{format.label}</button
      >
    {/each}
  </div>

  <h4>Professional exits</h4>
  <p class="longform-output-muted">
    Publisher Manuscript: title page, cleaned text, chapters, DOCX. Reading Book: opening, asterisms, HTML to read.
  </p>
  {#if hasPublisher && hasReading}
    <p class="longform-output-muted">Both workflows are in the Compile tab.</p>
  {:else}
    <button type="button" on:click={() => ensureProfessionalWorkflows()}
      >Install publisher and reading workflows</button
    >
  {/if}

  <h4>Page as it will print</h4>
  <p class="longform-output-muted">
    See the type area, page breaks, and verse lines before paper or PDF.
  </p>
  <button type="button" on:click={() => void showPrintPreview(app)}>Open print preview</button>

  <h4>Import</h4>
  <div class="longform-output-actions">
    <button type="button" on:click={() => importMarkdownFolder(app)}>Markdown folder</button>
    <button type="button" on:click={() => importDocxFile(app)}>DOCX</button>
    <button type="button" on:click={() => importScrivener(app)}>Scrivener</button>
  </div>
  <p class="longform-output-muted">
    Imports land as scenes in the current multi-scene draft. The structure is read from the files; you do not rebuild it by hand.
  </p>
</div>

<style>
  .longform-output {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-output-muted {
    color: var(--text-muted);
  }

  .longform-output-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 100%;
    min-width: 0;
  }

  button {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
  }

  button.selected {
    color: var(--text-accent);
  }
</style>
