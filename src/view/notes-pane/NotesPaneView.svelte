<script lang="ts">
  import { PAGE_FORMS } from "src/model/page-form";
  import type { PageForm } from "src/model/page-form";

  import type { PrivateComment } from "./NotesPane";

  export let comments: PrivateComment[] = [];
  export let missingWords: PrivateComment[] = [];
  export let project = "";
  export let form: PageForm = "prose";
  export let onOpen: (comment: PrivateComment) => void = () => {};
  export let onForm: (form: PageForm) => void = () => {};
  export let onStanza: () => void = () => {};
  export let onScene: () => void = () => {};
  export let onCharacter: () => void = () => {};
  export let onParenthetical: () => void = () => {};
  export let onDash: () => void = () => {};
  export let onHyphen: () => void = () => {};
  export let onQuotes: () => void = () => {};
  export let onMissing: () => void = () => {};
  export let onBeside: () => void = () => {};

  const formLabel: Record<PageForm, string> = {
    prose: "Prose",
    verse: "Verse",
    column: "Column",
    script: "Script",
  };

  $: groups = comments.reduce((list, comment) => {
    const found = list.find((group) => group.path === comment.path);
    if (found) {
      found.comments.push(comment);
      return list;
    }
    list.push({
      path: comment.path,
      title: comment.title,
      comments: [comment],
    });
    return list;
  }, [] as { path: string; title: string; comments: PrivateComment[] }[]);
</script>

<div class="longform-notes-pane">
  <h3>Page form</h3>
  {#if !project}
    <p class="longform-notes-empty">Open a Longform note.</p>
  {:else}
    <div class="longform-form-bar">
      {#each PAGE_FORMS as item (item)}
        <button
          type="button"
          class="longform-notes-item"
          class:is-active={form === item}
          on:click={() => onForm(item)}
        >
          {formLabel[item]}
        </button>
      {/each}
    </div>
    {#if form === "verse"}
      <button type="button" class="longform-notes-item" on:click={onStanza}>
        New stanza
      </button>
    {:else if form === "script"}
      <div class="longform-notes-list">
        <button type="button" class="longform-notes-item" on:click={onScene}>
          Scene heading
        </button>
        <button type="button" class="longform-notes-item" on:click={onCharacter}>
          Character cue
        </button>
        <button
          type="button"
          class="longform-notes-item"
          on:click={onParenthetical}
        >
          Parenthetical
        </button>
      </div>
    {/if}
    <div class="longform-form-bar">
      <button type="button" class="longform-notes-item" on:click={onDash}>
        — Dash
      </button>
      <button type="button" class="longform-notes-item" on:click={onHyphen}>
        - Hyphen
      </button>
      <button type="button" class="longform-notes-item" on:click={onQuotes}>
        “” Quotes
      </button>
      <button type="button" class="longform-notes-item" on:click={onMissing}>
        TK
      </button>
      <button type="button" class="longform-notes-item" on:click={onBeside}>
        Beside
      </button>
    </div>
  {/if}
  <h3>Private comments</h3>
  <p class="longform-notes-lead">
    Questions kept in the note. Obsidian's word and character counts still
    include them.
  </p>
  {#if !project}
    <p class="longform-notes-empty">Open a Longform note.</p>
  {:else}
    {#if comments.length === 0}
      <p class="longform-notes-empty">None in {project}.</p>
    {:else}
      {#each groups as group (group.path)}
        <h4>{group.title}</h4>
        <div class="longform-notes-list">
          {#each group.comments as comment, index (`${comment.line}:${comment.ch}:${index}`)}
            <button
              type="button"
              class="longform-notes-item"
              on:click={() => onOpen(comment)}
            >
              {comment.text.length > 0 ? comment.text : "(empty)"}
            </button>
          {/each}
        </div>
      {/each}
    {/if}
    <h4>Missing words</h4>
    {#if missingWords.length === 0}
      <p class="longform-notes-empty">No TK in {project}.</p>
    {:else}
      <div class="longform-notes-list">
        {#each missingWords as word, index (`${word.path}:${word.line}:${word.ch}:${index}`)}
          <button
            type="button"
            class="longform-notes-item"
            on:click={() => onOpen(word)}
          >
            {word.text}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .longform-notes-pane {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
    padding: var(--size-4-3);
    overflow-wrap: anywhere;
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4 {
    margin: 0;
  }

  h3 + h3,
  .longform-notes-pane > h3:not(:first-child) {
    margin-top: var(--size-4-6);
  }

  .longform-form-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-1);
    max-width: 100%;
    min-width: 0;
    margin-top: var(--size-4-2);
  }

  .longform-form-bar .longform-notes-item {
    width: auto;
    flex: 1 1 40%;
    font-style: normal;
  }

  .longform-notes-item.is-active {
    border-color: var(--text-accent);
  }

  h4 {
    margin-top: var(--size-4-4);
    color: var(--text-muted);
    font-size: var(--font-ui-small);
    font-weight: var(--font-medium);
  }

  .longform-notes-lead,
  .longform-notes-empty {
    color: var(--text-muted);
    font-size: var(--font-ui-small);
  }

  .longform-notes-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    margin-top: var(--size-4-2);
    max-width: 100%;
    min-width: 0;
  }

  .longform-notes-item {
    display: block;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    height: auto;
    padding: var(--size-4-1) var(--size-4-2);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    background: var(--background-primary);
    color: var(--text-normal);
    font: inherit;
    font-style: italic;
    line-height: 1.4;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    text-align: left;
    cursor: pointer;
  }

  .longform-notes-item:hover {
    background: var(--background-modifier-hover);
  }
</style>
