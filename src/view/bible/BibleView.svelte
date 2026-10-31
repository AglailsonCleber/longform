<script lang="ts">
  import { Notice, TFile } from "obsidian";

  import {
    cardsForProject,
    dialogueVoiceHits,
    nameSound,
    sceneMarkers,
    scenesForPlace,
    scenesInEra,
    type BibleCard,
    type CardKind,
    type SceneSheet,
  } from "src/model/bible";
  import { bibleCards } from "src/model/bible-store";
  import { scenePath } from "src/model/scene-navigation";
  import { drafts, selectedDraft } from "src/model/stores";
  import { activeFile } from "src/view/stores";
  import { useApp } from "src/view/utils";
  import { createBibleCard, replaceNameInProject } from "src/commands/bible";

  import { AskStringModal, ReplaceNameModal } from "./bible-modals";

  const app = useApp();

  const kindLabel: Record<CardKind, string> = {
    person: "People",
    place: "Places",
    thing: "Things",
    world: "World",
  };

  let scenes: SceneSheet[] = [];
  let tried = "";

  $: title = $selectedDraft?.title ?? "";
  $: projectDrafts = $drafts.filter((draft) => draft.title === title);
  $: cards = cardsForProject($bibleCards, title);
  $: lexicon = cards.find((card) => card.lexicon)?.lexicon ?? null;
  $: groups = [
    { kind: "person" as const, list: cards.filter((card) => card.kind === "person") },
    { kind: "place" as const, list: cards.filter((card) => card.kind === "place") },
    { kind: "thing" as const, list: cards.filter((card) => card.kind === "thing") },
    { kind: "world" as const, list: cards.filter((card) => card.kind === "world") },
  ];
  $: people = groups[0].list;
  $: activeScene = scenes.find((scene) => scene.path === $activeFile?.path) ?? null;
  $: voiceHits = activeScene ? dialogueVoiceHits(activeScene.text, people) : [];
  $: triedSound = tried.trim().length > 0 ? nameSound(tried, lexicon) : null;

  async function loadScenes(): Promise<void> {
    const next: SceneSheet[] = [];
    for (const draft of projectDrafts) {
      const label = draft.draftTitle?.trim() || draft.title;
      if (draft.format === "single") {
        const file = app.vault.getAbstractFileByPath(draft.vaultPath);
        if (file instanceof TFile) {
          next.push(await sheet(file, draft.title, label));
        }
        continue;
      }
      for (const scene of draft.scenes) {
        let path = "";
        try {
          path = scenePath(scene.title, draft, app.vault);
        } catch {
          path = "";
        }
        const file = path ? app.vault.getAbstractFileByPath(path) : null;
        if (file instanceof TFile) {
          next.push(await sheet(file, scene.title, label));
        }
      }
    }
    scenes = next;
  }

  async function sheet(file: TFile, sceneTitle: string, draftLabel: string): Promise<SceneSheet> {
    const text = await app.vault.cachedRead(file);
    const markers = sceneMarkers(app.metadataCache.getFileCache(file)?.frontmatter);
    return {
      path: file.path,
      title: sceneTitle,
      draft: draftLabel,
      text,
      place: markers.place,
      when: markers.when,
    };
  }

  $: title, projectDrafts, void loadScenes();

  function ask(kind: CardKind, heading: string): void {
    const draft = $selectedDraft;
    if (!draft) {
      return;
    }
    new AskStringModal(app, heading, (value) => {
      void createBibleCard(app, draft, kind, value).then((file) => {
        if (file) {
          void app.workspace.getLeaf(false).openFile(file);
        }
      });
    }).open();
  }

  function openPath(path: string): void {
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice("That note is not in the vault.");
      return;
    }
    void app.workspace.getLeaf(false).openFile(file);
  }

  function rename(card: BibleCard): void {
    new ReplaceNameModal(
      app,
      card.names[0],
      (fromName, toName) => replaceNameInProject(app, title, fromName, toName, false),
      async (fromName, toName) => {
        const count = await replaceNameInProject(app, title, fromName, toName, true);
        new Notice(
          count === 0 ? "That name is not in the manuscript." : `Replaced ${count}.`
        );
        return count;
      }
    ).open();
  }

  function bondText(card: BibleCard): string {
    return card.bonds
      .map((bond) => {
        const when = [bond.from, bond.until].filter((part) => part.length > 0).join(" – ");
        return `${bond.label || "bond"} with ${bond.with}${when ? ` (${when})` : ""}`;
      })
      .join("; ");
  }
</script>

<div class="longform-bible">
  {#if !title}
    <p class="longform-bible-muted">Open a Longform note.</p>
  {:else}
    <h3>Series bible</h3>
    <p class="longform-bible-muted">
      Cards belong to {title}. Every draft of this project uses the same cast and world.
    </p>
    <div class="longform-bible-actions">
      <button type="button" on:click={() => ask("person", "New person")}>Person</button>
      <button type="button" on:click={() => ask("place", "New place")}>Place</button>
      <button type="button" on:click={() => ask("thing", "New thing")}>Thing</button>
      <button type="button" on:click={() => ask("world", "New world")}>World</button>
    </div>

    {#each groups as group (group.kind)}
      <h4>{kindLabel[group.kind]}</h4>
      {#if group.list.length === 0}
        <p class="longform-bible-muted">None yet.</p>
      {:else}
        {#each group.list as card (card.path)}
          <article class="longform-bible-card">
            <button type="button" class="longform-bible-open" on:click={() => openPath(card.path)}>
              {card.names[0]}
            </button>
            <p class="longform-bible-meta">
              <span class:is-hypothesis={card.status === "hypothesis"}>{card.status}</span>
              <span class:is-fact={card.basis === "fact"}>{card.basis}</span>
            </p>
            {#if card.names.length > 1}
              <p class="longform-bible-muted">Also called {card.names.slice(1).join(", ")}.</p>
            {/if}
            {#if lexicon && !nameSound(card.names[0], lexicon).fits}
              <p class="longform-bible-muted">{nameSound(card.names[0], lexicon).detail}</p>
            {/if}
            {#if card.bonds.length > 0}
              <p>{bondText(card)}</p>
            {/if}
            {#if card.voice.words.length > 0 || card.voice.never.length > 0}
              <p class="longform-bible-muted">
                {#if card.voice.words.length > 0}Says {card.voice.words.join(", ")}. {/if}
                {#if card.voice.never.length > 0}Never says {card.voice.never.join(", ")}.{/if}
              </p>
            {/if}
            {#if card.kind === "place"}
              {@const linked = scenesForPlace(card, scenes)}
              {#if linked.length === 0}
                <p class="longform-bible-muted">No scene names this place yet.</p>
              {:else}
                {#each linked as item (item.path)}
                  <button type="button" class="longform-bible-link" on:click={() => openPath(item.path)}>
                    {item.draft}: {item.title}
                  </button>
                {/each}
              {/if}
            {/if}
            {#if card.calendar}
              <p class="longform-bible-muted">
                {#if card.calendar.weekdays.length > 0}Days: {card.calendar.weekdays.join(", ")}. {/if}
                {#if card.calendar.moons.length > 0}Moons: {card.calendar.moons.join(", ")}.{/if}
              </p>
              {#each card.calendar.eras as era (era.name)}
                <p>{era.name}{era.span ? ` · ${era.span}` : ""}</p>
                {#each scenesInEra(era.name, scenes) as item (item.path)}
                  <button type="button" class="longform-bible-link" on:click={() => openPath(item.path)}>
                    {item.draft}: {item.title} · {item.when}
                  </button>
                {/each}
              {/each}
            {/if}
            {#if card.lexicon}
              <p class="longform-bible-muted">
                {card.lexicon.tongue || "Tongue"}
                {#if card.lexicon.endings.length > 0}
                  ends in {card.lexicon.endings.join(", ")}.
                {/if}
                {#if card.lexicon.samples.length > 0}
                  Samples: {card.lexicon.samples.join(", ")}.
                {/if}
              </p>
            {/if}
            <button type="button" class="longform-bible-link" on:click={() => rename(card)}>
              Replace this name in the book
            </button>
          </article>
        {/each}
      {/if}
    {/each}

    <h4>Try a name</h4>
    <input bind:value={tried} type="text" placeholder="A new name" />
    {#if triedSound}
      <p class="longform-bible-muted">{triedSound.detail}</p>
    {/if}

    <h4>Dialogue check</h4>
    {#if !activeScene}
      <p class="longform-bible-muted">Open a scene to check what a person would never say.</p>
    {:else if voiceHits.length === 0}
      <p class="longform-bible-muted">No forbidden word in the dialogue of this scene.</p>
    {:else}
      {#each voiceHits as hit (`${hit.line}:${hit.who}:${hit.word}`)}
        <p>
          Line {hit.line + 1}: {hit.who} never says “{hit.word}”{hit.knownSpeaker ? "" : " (speaker not marked)"}.
        </p>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .longform-bible {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-bible-muted {
    color: var(--text-muted);
  }

  .longform-bible-actions,
  .longform-bible-card {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
    max-width: 100%;
  }

  .longform-bible-card {
    flex-direction: column;
    margin-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  button,
  input {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
  }

  .longform-bible-open,
  .longform-bible-link,
  .longform-bible-actions button {
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
    height: auto;
  }

  .longform-bible-meta span {
    margin-right: 0.5rem;
    text-transform: uppercase;
    font-size: var(--font-ui-smaller);
  }

  .is-hypothesis {
    border-bottom: 1px dashed var(--text-muted);
  }

  .is-fact {
    color: var(--text-accent);
  }
</style>
