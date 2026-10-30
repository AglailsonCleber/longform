<script lang="ts">
  import type { PrivateComment } from "./NotesPane";

  export let comments: PrivateComment[] = [];
  export let missingWords: PrivateComment[] = [];
  export let project = "";
  export let onOpen: (comment: PrivateComment) => void = () => {};

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
