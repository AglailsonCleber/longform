<script lang="ts">
  import { MarkdownView, TFile } from "obsidian";
  import { onMount } from "svelte";

  import {
    editCentralEffect,
    editKnowledge,
    editMotifs,
    hangAlternateEnding,
    pinOpeningAndClose,
    setStoryLength,
    sittingTimeNotice,
  } from "src/commands/story";
  import { loadPlotScenes } from "src/commands/plot";
  import { craftTick } from "src/model/craft-store";
  import { countWordsSimple } from "src/model/habit";
  import { endingGroups } from "src/model/plot";
  import { scenePath } from "src/model/scene-navigation";
  import { pluginSettings, selectedDraft } from "src/model/stores";
  import {
    dilutingPassages,
    lengthStatus,
    motifSightings,
    projectMotifs,
    sittingReadMinutes,
    storyFromFrontmatter,
  } from "src/model/story";
  import { selectedTab } from "src/view/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let text = "";
  let path = "";
  let endings: { trunk: { title: string }[]; alternates: { title: string }[] } = {
    trunk: [],
    alternates: [],
  };
  let sightings: ReturnType<typeof motifSightings> = [];

  $: void $craftTick;
  $: sheet = (() => {
    void $craftTick;
    if (!path) {
      return storyFromFrontmatter(null);
    }
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return storyFromFrontmatter(null);
    }
    return storyFromFrontmatter(app.metadataCache.getFileCache(file)?.frontmatter);
  })();
  $: words = countWordsSimple(text);
  $: status = lengthStatus(words, sheet);
  $: minutes = sittingReadMinutes(
    words,
    $pluginSettings.readingWordsPerMinute || 200
  );
  $: weak = dilutingPassages(text, sheet.effect);

  async function refresh(): Promise<void> {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    path = view?.file?.path ?? "";
    text = view?.editor.getValue() ?? "";
    const scenes = await loadPlotScenes(app);
    const groups = endingGroups(scenes);
    endings = {
      trunk: groups.trunk.map((scene) => ({ title: scene.title })),
      alternates: groups.alternates.map((scene) => ({ title: scene.title })),
    };
    const draft = $selectedDraft;
    if (!draft) {
      sightings = [];
      return;
    }
    const index = app.vault.getAbstractFileByPath(draft.vaultPath);
    const motifs =
      index instanceof TFile
        ? projectMotifs(app.metadataCache.getFileCache(index)?.frontmatter)
        : [];
    const pieces: {
      path: string;
      title: string;
      text: string;
      motifs: string[];
    }[] = [];
    if (draft.format === "single") {
      const file = app.vault.getAbstractFileByPath(draft.vaultPath);
      if (file instanceof TFile) {
        pieces.push({
          path: file.path,
          title: draft.title,
          text: await app.vault.cachedRead(file),
          motifs: storyFromFrontmatter(
            app.metadataCache.getFileCache(file)?.frontmatter
          ).motifs,
        });
      }
    } else {
      for (const scene of draft.scenes) {
        const sceneFilePath = scenePath(scene.title, draft, app.vault);
        const file = app.vault.getAbstractFileByPath(sceneFilePath);
        if (!(file instanceof TFile)) {
          continue;
        }
        pieces.push({
          path: file.path,
          title: scene.title,
          text: await app.vault.cachedRead(file),
          motifs: storyFromFrontmatter(
            app.metadataCache.getFileCache(file)?.frontmatter
          ).motifs,
        });
      }
    }
    sightings = motifSightings(pieces, motifs);
  }

  onMount(() => {
    void refresh();
    const a = app.workspace.on("active-leaf-change", () => void refresh());
    const b = app.workspace.on("editor-change", () => void refresh());
    return () => {
      app.workspace.offref(a);
      app.workspace.offref(b);
    };
  });
</script>

<div class="longform-story">
  <h3>Story</h3>
  <p class="longform-story-muted">
    A short story is not an orphan chapter. It has a ceiling, a turn, an ending, and its own submission life.
  </p>

  <h4>Length floor and ceiling</h4>
  <p class="longform-story-muted">
    Micro, flash, story, novelette — the goal of the piece, not of a novel.
  </p>
  <div class="longform-story-actions">
    <button type="button" on:click={() => setStoryLength(app, "micro")}>Micro</button>
    <button type="button" on:click={() => setStoryLength(app, "flash")}>Flash</button>
    <button type="button" on:click={() => setStoryLength(app, "story")}>Story</button>
    <button type="button" on:click={() => setStoryLength(app, "novelette")}
      >Novelette</button
    >
  </div>
  <p>
    {words} words
    {#if status.floor > 0}
      · floor {status.floor}
    {/if}
    {#if status.ceiling > 0}
      · ceiling {status.ceiling}
    {/if}
    {#if status.belowFloor} · below floor{/if}
    {#if status.overCeiling} · over ceiling{/if}
  </p>

  <h4>Pinned opening and close</h4>
  <p class="longform-story-muted">
    Keep the first and last paragraphs in sight while the middle is rewritten.
  </p>
  <button type="button" on:click={() => pinOpeningAndClose(app)}>Pin edges</button>
  {#if sheet.pinOpen}
    <p><strong>Open:</strong> {sheet.pinOpen.slice(0, 160)}</p>
  {/if}
  {#if sheet.pinClose}
    <p><strong>Close:</strong> {sheet.pinClose.slice(0, 160)}</p>
  {/if}

  <h4>What the reader already knows</h4>
  <button type="button" on:click={() => editKnowledge(app)}>Mark revealed / secret</button>
  {#if sheet.revealed.length > 0}
    <p>Known: {sheet.revealed.join(" · ")}</p>
  {/if}
  {#if sheet.secret.length > 0}
    <p>Secret: {sheet.secret.join(" · ")}</p>
  {/if}

  <h4>Central effect</h4>
  <p class="longform-story-muted">
    One sentence about what the story wants to do. Revision shows what dilutes it.
  </p>
  <button type="button" on:click={() => editCentralEffect(app)}>Set effect</button>
  {#if sheet.effect}
    <p>{sheet.effect}</p>
  {/if}
  {#each weak as passage (passage)}
    <p class="longform-story-muted">May dilute: {passage}…</p>
  {/each}

  <h4>Endings without copying the story</h4>
  <p class="longform-story-muted">Two or three exits hung on the same trunk.</p>
  <button type="button" on:click={() => hangAlternateEnding(app)}>Hang alternate ending</button>
  <p>
    Trunk: {endings.trunk.map((item) => item.title).join(", ") || "—"} · Alternates:
    {endings.alternates.map((item) => item.title).join(", ") || "—"}
  </p>

  <h4>Cycle and motif</h4>
  <div class="longform-story-actions">
    <button type="button" on:click={() => editMotifs(app, true)}>Collection motifs</button>
    <button type="button" on:click={() => editMotifs(app, false)}>Piece motifs</button>
  </div>
  {#each sightings as hit (hit.path + hit.motif)}
    <p class="longform-story-muted">{hit.motif} · {hit.title} · ×{hit.count}</p>
  {/each}

  <h4>Submission per piece</h4>
  <p class="longform-story-muted">
    Each story keeps sends, deadlines, and acceptances. The collection does not erase that history — see Life.
  </p>
  <button type="button" on:click={() => selectedTab.set("Life")}
    >Open Life for submissions</button
  >

  <h4>One sitting</h4>
  <p>{words} words · about {minutes} min to read the whole piece as the reader would.</p>
  <button type="button" on:click={() => sittingTimeNotice(app)}>Recalculate</button>
</div>

<style>
  .longform-story {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-story-muted {
    color: var(--text-muted);
  }

  .longform-story-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
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
</style>
