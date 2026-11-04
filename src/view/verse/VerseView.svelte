<script lang="ts">
  import { MarkdownView, TFile } from "obsidian";
  import { onMount } from "svelte";

  import {
    correctStress,
    insertFormScaffold,
    lookupRhymes,
    setFoldStanza,
    showLineScansion,
    toggleSoundLayer,
  } from "src/commands/verse";
  import { FORM_KEY } from "src/model/architecture";
  import { craftTick, soundLayers, verseMode } from "src/model/craft-store";
  import { scenePath } from "src/model/scene-navigation";
  import { selectedDraft } from "src/model/stores";
  import {
    FIXED_FORMS,
    FORM_ATLAS,
    FORM_KIND_KEY,
    collectionOverview,
    foldStanzaIndex,
    formGaps,
    formProgress,
    parseFixedForm,
    scanPoem,
    stanzaBlocks,
    stressMapFromFrontmatter,
    type FixedForm,
  } from "src/model/verse";
  import { useApp } from "src/view/utils";

  const app = useApp();
  const formKinds = FIXED_FORMS;

  let activeText = "";
  let activePath = "";
  let overview: ReturnType<typeof collectionOverview> = [];

  $: void $craftTick;
  $: frontmatter = (() => {
    void $craftTick;
    if (!activePath) {
      return null;
    }
    const file = app.vault.getAbstractFileByPath(activePath);
    if (!(file instanceof TFile)) {
      return null;
    }
    return app.metadataCache.getFileCache(file)?.frontmatter ?? null;
  })();

  $: stress = stressMapFromFrontmatter(frontmatter);
  $: scans = scanPoem(activeText, stress);
  $: form = parseFixedForm(frontmatter?.[FORM_KIND_KEY]);
  $: slots = form ? formProgress(activeText, form) : [];
  $: gaps = formGaps(slots);
  $: fold = foldStanzaIndex(frontmatter);
  $: stanzas = stanzaBlocks(activeText);
  $: scheme = scans
    .filter((line) => line.text.trim().length > 0)
    .map((line) => line.rhymeLetter || "—")
    .join(" ");

  async function refresh(): Promise<void> {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    activePath = view?.file?.path ?? "";
    activeText = view?.editor.getValue() ?? "";
    const draft = $selectedDraft;
    if (!draft) {
      overview = [];
      return;
    }
    const poems: { path: string; title: string; text: string; form: FixedForm | "" }[] =
      [];
    if (draft.format === "single") {
      const file = app.vault.getAbstractFileByPath(draft.vaultPath);
      if (file instanceof TFile) {
        const fm = app.metadataCache.getFileCache(file)?.frontmatter;
        poems.push({
          path: file.path,
          title: draft.title,
          text: await app.vault.cachedRead(file),
          form: parseFixedForm(fm?.[FORM_KIND_KEY]),
        });
      }
    } else {
      for (const scene of draft.scenes) {
        const path = scenePath(scene.title, draft, app.vault);
        const file = app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
          continue;
        }
        const fm = app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.[FORM_KEY] !== "verse" && !parseFixedForm(fm?.[FORM_KIND_KEY])) {
          continue;
        }
        poems.push({
          path: file.path,
          title: scene.title,
          text: await app.vault.cachedRead(file),
          form: parseFixedForm(fm?.[FORM_KIND_KEY]),
        });
      }
    }
    overview = collectionOverview(poems);
  }

  onMount(() => {
    void refresh();
    const ref = app.workspace.on("active-leaf-change", () => {
      void refresh();
    });
    const ref2 = app.workspace.on("editor-change", () => {
      void refresh();
    });
    return () => {
      app.workspace.offref(ref);
      app.workspace.offref(ref2);
    };
  });
</script>

<div class="longform-verse-pane">
  <h3>Verse</h3>
  <p class="longform-verse-muted">
    A poetry tool reads sound and form. Counting words and offering rhyme by spelling gets in the way.
  </p>

  <h4>Syllables on the margin</h4>
  <p class="longform-verse-muted">
    Classical and phonetic counts update while you write. Portuguese diphthong, hiatus, syneresis, and elision — not an English ruler.
  </p>
  <div class="longform-verse-actions">
    <button
      type="button"
      class:selected={$verseMode === "classical"}
      on:click={() => verseMode.set("classical")}>Classical</button
    >
    <button
      type="button"
      class:selected={$verseMode === "phonetic"}
      on:click={() => verseMode.set("phonetic")}>Phonetic</button
    >
    <button type="button" on:click={() => showLineScansion(app)}>This line</button>
    <button type="button" on:click={() => void correctStress(app)}>Correct stress</button>
  </div>
  <div class="longform-verse-lines">
    {#each scans as line, index (index)}
      {#if line.text.trim().length > 0}
        <div class="longform-verse-line">
          <span class="longform-verse-count"
            >{$verseMode === "phonetic" ? line.phonetic : line.classical}</span
          >
          <span class="longform-verse-rhyme">{line.rhymeLetter || "·"}</span>
          <span class="longform-verse-text">{line.text}</span>
        </div>
      {/if}
    {/each}
  </div>

  <h4>Rhyme</h4>
  <p class="longform-verse-muted">
    Perfect rhyme keeps a capital letter; assonance a lowercase family. Scheme: {scheme || "—"}.
  </p>
  <button type="button" on:click={() => lookupRhymes(app)}>Rhyme dictionary by sound</button>

  <h4>Fixed forms</h4>
  <p class="longform-verse-muted">
    Sonnet, haiku, villanelle, sestina, redondilha, décima, quatrain. The form shows what still does not close.
  </p>
  <div class="longform-verse-actions">
    {#each formKinds as kind (kind)}
      <button type="button" on:click={() => void insertFormScaffold(app, kind)}
        >{FORM_ATLAS[kind].label}</button
      >
    {/each}
  </div>
  {#if form}
    <p>
      {FORM_ATLAS[form].label} · {FORM_ATLAS[form].scheme} · {gaps} still open
    </p>
  {/if}

  <h4>Sound layers</h4>
  <p class="longform-verse-muted">
    Alliteration, assonance, and echo — each switchable. With all off, the poem stays readable.
  </p>
  <div class="longform-verse-actions">
    <button
      type="button"
      class:selected={$soundLayers.alliteration}
      on:click={() => toggleSoundLayer("alliteration", app)}>Alliteration</button
    >
    <button
      type="button"
      class:selected={$soundLayers.assonance}
      on:click={() => toggleSoundLayer("assonance", app)}>Assonance</button
    >
    <button
      type="button"
      class:selected={$soundLayers.echo}
      on:click={() => toggleSoundLayer("echo", app)}>Echo</button
    >
  </div>

  <h4>Folded stanza</h4>
  <p class="longform-verse-muted">Work one block with the rest of the poem tucked away.</p>
  <div class="longform-verse-actions">
    {#each stanzas as _stanza, index (index)}
      <button
        type="button"
        class:selected={fold === index + 1}
        on:click={() => setFoldStanza(app, fold === index + 1 ? 0 : index + 1)}
        >Stanza {index + 1}</button
      >
    {/each}
    {#if fold > 0}
      <button type="button" on:click={() => setFoldStanza(app, 0)}>Show all</button>
    {/if}
  </div>

  <h4>Session goal</h4>
  <p class="longform-verse-muted">
    Day goals in lines or stanzas live under Habit and Settings — not a thousand words.
  </p>

  <h4>Collection</h4>
  <p class="longform-verse-muted">
    Meter, scheme, and irregularity across poems before layout.
  </p>
  {#each overview as poem (poem.path)}
    <p>
      {poem.title} · {poem.lines} lines · {poem.stanzas} stanzas · {poem.scheme || "—"}
      {#if poem.irregular} · irregular{/if}
    </p>
  {/each}

  <h4>Export</h4>
  <p class="longform-verse-muted">
    Output keeps verse breaks as lines and stanzas as stanzas — see the Output tab.
  </p>
</div>

<style>
  .longform-verse-pane {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-verse-muted {
    color: var(--text-muted);
  }

  .longform-verse-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .longform-verse-lines {
    max-height: 14rem;
    overflow: auto;
    margin: 0.5rem 0;
  }

  .longform-verse-line {
    display: grid;
    grid-template-columns: 2rem 1.25rem 1fr;
    gap: 0.35rem;
    font-size: 0.85rem;
  }

  .longform-verse-count,
  .longform-verse-rhyme {
    color: var(--text-muted);
    text-align: right;
  }

  button.selected {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
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
