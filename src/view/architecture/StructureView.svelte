<script lang="ts">
  import { TFile } from "obsidian";

  import {
    createFormPiece,
    markWritten,
    moveReadingOrder,
    readManuscript,
    savePiece,
    writeContents,
  } from "src/commands/architecture";
  import {
    contentsOf,
    inWritingOrder,
    pieceFromFrontmatter,
    pieceMatches,
    type PieceRole,
    type PieceSheet,
    type PieceStatus,
    type PieceUnit,
  } from "src/model/architecture";
  import { structureRevision } from "src/model/architecture-store";
  import { countedWords, todayStamp } from "src/model/capture";
  import { scenePath } from "src/model/scene-navigation";
  import { selectedDraft } from "src/model/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  const statuses: PieceStatus[] = ["idea", "draft", "revision", "ready"];
  const units: PieceUnit[] = ["book", "part", "act", "chapter", "scene"];
  const roles: PieceRole[] = ["manuscript", "cut", "variant", "appendix"];

  const statusLabel: Record<PieceStatus, string> = {
    idea: "Idea",
    draft: "Draft",
    revision: "Revision",
    ready: "Ready",
  };
  const unitLabel: Record<PieceUnit, string> = {
    book: "Book",
    part: "Part",
    act: "Act",
    chapter: "Chapter",
    scene: "Scene",
  };
  const roleLabel: Record<PieceRole, string> = {
    manuscript: "In the book",
    cut: "Cut",
    variant: "Variant",
    appendix: "Appendix",
  };

  let order: "reading" | "writing" = "reading";
  let showHeld = true;
  let statusFilter: PieceStatus | "" = "";
  let povFilter = "";
  let placeFilter = "";
  let whenFilter = "";
  let castFilter = "";
  let selected = "";
  let synopsis = "";
  let pov = "";
  let place = "";
  let when = "";
  let castText = "";
  let unit: PieceUnit | "" = "";
  let role: PieceRole | "" = "";
  let written = "";
  let ceiling = 0;
  let pieceStatus: PieceStatus | "" = "";
  let words: Record<string, number> = {};

  function sheets(): PieceSheet[] {
    const draft = $selectedDraft;
    const _revision = $structureRevision;
    void _revision;
    if (!draft) {
      return [];
    }
    if (draft.format === "single") {
      const file = app.vault.getAbstractFileByPath(draft.vaultPath);
      return [
        pieceFromFrontmatter(
          draft.vaultPath,
          draft.title,
          0,
          file instanceof TFile ? app.metadataCache.getFileCache(file)?.frontmatter : undefined
        ),
      ];
    }
    const pieces: PieceSheet[] = [];
    for (const scene of draft.scenes) {
      const path = scenePath(scene.title, draft, app.vault);
      if (!path) {
        continue;
      }
      const file = app.vault.getAbstractFileByPath(path);
      pieces.push(
        pieceFromFrontmatter(
          path,
          scene.title,
          scene.indent,
          file instanceof TFile ? app.metadataCache.getFileCache(file)?.frontmatter : undefined
        )
      );
    }
    return pieces;
  }

  $: pieces = sheets();
  $: visible = pieces.filter((piece) => {
    if (!showHeld && (piece.role === "cut" || piece.role === "variant" || piece.role === "appendix")) {
      return false;
    }
    return pieceMatches(piece, {
      status: statusFilter,
      pov: povFilter,
      place: placeFilter,
      when: whenFilter,
      cast: castFilter,
    });
  });
  $: ordered = order === "writing" ? inWritingOrder(visible) : visible;
  $: contents = contentsOf(pieces);

  async function loadWords(list: PieceSheet[]): Promise<void> {
    const next: Record<string, number> = {};
    for (const piece of list) {
      if (piece.ceiling <= 0) {
        continue;
      }
      const file = app.vault.getAbstractFileByPath(piece.path);
      if (file instanceof TFile) {
        next[piece.path] = countedWords(await app.vault.cachedRead(file));
      }
    }
    words = next;
  }

  $: void loadWords(pieces);

  function choose(piece: PieceSheet): void {
    selected = piece.path;
    synopsis = piece.synopsis;
    pov = piece.pov;
    place = piece.place;
    when = piece.when;
    castText = piece.cast.join(", ");
    unit = piece.unit;
    role = piece.role || "manuscript";
    written = piece.written;
    ceiling = piece.ceiling;
    pieceStatus = piece.status;
    const file = app.vault.getAbstractFileByPath(piece.path);
    if (file instanceof TFile) {
      void app.workspace.getLeaf(false).openFile(file);
    }
  }

  function castNames(): string[] {
    const names: string[] = [];
    for (const part of castText.split(",")) {
      const name = part.trim();
      if (name.length > 0) {
        names.push(name);
      }
    }
    return names;
  }

  async function keep(piece: PieceSheet): Promise<void> {
    await savePiece(app, {
      ...piece,
      synopsis,
      pov,
      place,
      when,
      cast: castNames(),
      unit,
      role,
      written,
      ceiling,
      status: pieceStatus,
    });
  }

  function shift(title: string, delta: number): void {
    const draft = $selectedDraft;
    if (!draft || draft.format !== "scenes") {
      return;
    }
    const index = draft.scenes.findIndex((scene) => scene.title === title);
    moveReadingOrder(draft.vaultPath, index, index + delta);
  }
</script>

<div class="longform-structure">
  <h3>Structure</h3>
  <p class="longform-structure-muted">
    Reading order is the book. Writing order follows the date on each piece. A cut scene, a variant, and an appendix stay here and stay out of the manuscript.
  </p>
  <div class="longform-structure-actions">
    <button type="button" on:click={() => void readManuscript(app)}>Read through</button>
    <button type="button" on:click={() => void writeContents(app)}>Contents</button>
    <button type="button" on:click={() => void createFormPiece(app, "scene")}>Scene</button>
    <button type="button" on:click={() => void createFormPiece(app, "sonnet")}>Sonnet</button>
    <button type="button" on:click={() => void createFormPiece(app, "chronicle")}>Column</button>
  </div>
  <div class="longform-structure-actions">
    <button type="button" class:selected={order === "reading"} on:click={() => (order = "reading")}
      >Reading order</button
    >
    <button type="button" class:selected={order === "writing"} on:click={() => (order = "writing")}
      >Writing order</button
    >
    <button type="button" class:selected={showHeld} on:click={() => (showHeld = !showHeld)}
      >{showHeld ? "Held pieces shown" : "Held pieces hidden"}</button
    >
  </div>
  <div class="longform-structure-actions">
    <button type="button" class:selected={statusFilter === ""} on:click={() => (statusFilter = "")}
      >Any state</button
    >
    {#each statuses as status (status)}
      <button
        type="button"
        class:selected={statusFilter === status}
        on:click={() => (statusFilter = status)}>{statusLabel[status]}</button
      >
    {/each}
  </div>
  <div class="longform-structure-fields">
    <input type="text" placeholder="Point of view" bind:value={povFilter} />
    <input type="text" placeholder="Place" bind:value={placeFilter} />
    <input type="text" placeholder="World time" bind:value={whenFilter} />
    <input type="text" placeholder="In the scene" bind:value={castFilter} />
  </div>

  {#each ordered as piece (piece.path)}
    <article class:selected={selected === piece.path}>
      <button type="button" class="longform-structure-open" on:click={() => choose(piece)}>
        {piece.title}
      </button>
      <p>{piece.synopsis || "No synopsis yet."}</p>
      <p class="longform-structure-muted">
        {piece.status ? statusLabel[piece.status] : "No state"}
        · {piece.unit ? unitLabel[piece.unit] : "Scene"}
        · {roleLabel[piece.role || "manuscript"]}
        {#if piece.written}· written {piece.written}{/if}
        {#if piece.ceiling > 0}
          · {words[piece.path] ?? 0} / {piece.ceiling} words
        {/if}
      </p>
      {#if piece.pov || piece.place || piece.when || piece.cast.length > 0}
        <p class="longform-structure-muted">
          {[piece.pov, piece.place, piece.when, piece.cast.join(", ")]
            .filter((part) => part.length > 0)
            .join(" · ")}
        </p>
      {/if}
      {#if selected === piece.path}
        <label>
          Synopsis
          <textarea bind:value={synopsis}></textarea>
        </label>
        <div class="longform-structure-fields">
          <input type="text" placeholder="Point of view" bind:value={pov} />
          <input type="text" placeholder="Place" bind:value={place} />
          <input type="text" placeholder="World time" bind:value={when} />
          <input type="text" placeholder="Who is here, separated by commas" bind:value={castText} />
        </div>
        <div class="longform-structure-actions">
          {#each statuses as status (status)}
            <button
              type="button"
              class:selected={pieceStatus === status}
              on:click={() => (pieceStatus = status)}>{statusLabel[status]}</button
            >
          {/each}
        </div>
        <div class="longform-structure-fields">
          <select bind:value={unit}>
            <option value="">Unit from the nesting</option>
            {#each units as item (item)}
              <option value={item}>{unitLabel[item]}</option>
            {/each}
          </select>
          <select bind:value={role}>
            {#each roles as item (item)}
              <option value={item}>{roleLabel[item]}</option>
            {/each}
          </select>
          <input type="number" min="0" placeholder="Word ceiling" bind:value={ceiling} />
        </div>
        <div class="longform-structure-actions">
          <button type="button" on:click={() => void keep(piece)}>Keep</button>
          <button
            type="button"
            on:click={() => {
              written = todayStamp(new Date());
              void markWritten(app, piece.path);
            }}>Written today</button
          >
          {#if order === "reading" && $selectedDraft && $selectedDraft.format === "scenes"}
            <button type="button" on:click={() => shift(piece.title, -1)}>Up</button>
            <button type="button" on:click={() => shift(piece.title, 1)}>Down</button>
          {/if}
        </div>
      {/if}
    </article>
  {/each}

  <h4>Contents</h4>
  {#each contents as line (`${line.number}-${line.title}`)}
    <p style={`padding-left: ${line.indent}rem`}>
      {line.number}. {unitLabel[line.unit]}. {line.title}
    </p>
  {/each}
</div>

<style>
  .longform-structure {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p,
  label {
    margin: 0.35rem 0;
  }

  article {
    margin: 0.55rem 0;
    min-width: 0;
  }

  .longform-structure-muted {
    color: var(--text-muted);
  }

  .longform-structure-actions,
  .longform-structure-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 100%;
    min-width: 0;
    margin: 0.35rem 0;
  }

  button,
  input,
  select,
  textarea {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
  }

  button {
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
  }

  button.selected {
    color: var(--text-accent);
  }

  textarea {
    display: block;
    width: 100%;
    min-height: 4rem;
  }

  .longform-structure-open {
    font-weight: var(--font-semibold);
  }
</style>
