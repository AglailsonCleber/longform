<script lang="ts">
  import { MarkdownView } from "obsidian";

  import {
    addBookWord,
    announcePage,
    askAboutPassage,
    backupProject,
    decryptProject,
    encryptProject,
    exportProject,
    indexWords,
    learnedNames,
    removeBookWord,
    searchProject,
  } from "src/commands/archive";
  import { jumpToLine } from "src/commands/revision";
  import type { SearchHit } from "src/model/archive";
  import { syllablesInText } from "src/model/archive";
  import { pluginSettings, selectedDraft } from "src/model/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let query = "";
  let hits: SearchHit[] = [];
  let syllables = "";
  let saved: string[] = [];

  function reloadWords(): void {
    saved = $selectedDraft ? indexWords(app, $selectedDraft) : [];
  }

  $: if ($selectedDraft) {
    reloadWords();
  }
  $: names = $selectedDraft ? learnedNames($selectedDraft) : [];
  $: suggestionsOn = $pluginSettings.suggestions;

  async function find(): Promise<void> {
    hits = await searchProject(app, query);
  }

  function countLine(): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      syllables = "";
      return;
    }
    const selected = view.editor.getSelection();
    const text = selected.length > 0 ? selected : view.editor.getLine(view.editor.getCursor().line);
    const count = syllablesInText(text);
    syllables = `${count} Portuguese syllable${count === 1 ? "" : "s"}.`;
  }
</script>

<div class="longform-archive">
  <h3>Archive</h3>
  <p class="longform-archive-muted">
    The book stays Markdown in this vault. A copy goes to a folder you can see. Sync is your choice. Longform does
    not upload the book.
  </p>
  <div class="longform-archive-actions">
    <button type="button" on:click={() => void backupProject(app)}>Back up this project</button>
    <button type="button" on:click={() => exportProject(app)}>Export</button>
    <button type="button" on:click={() => encryptProject(app)}>Encrypt a copy</button>
    <button type="button" on:click={() => decryptProject(app)}>Decrypt a copy</button>
  </div>
  <p class="longform-archive-muted">
    Backup and export write every scene, the cards, and the research. Encrypting asks for a passphrase and does not
    store it. Changing the scene list does not delete the note.
  </p>

  <h4>Search</h4>
  <div class="longform-archive-actions">
    <input bind:value={query} placeholder="Word in the book" on:keydown={(event) => event.key === "Enter" && void find()} />
    <button type="button" on:click={() => void find()}>Find</button>
  </div>
  <p class="longform-archive-muted" aria-live="polite">
    {hits.length === 0 ? "Text, cards, comments, and research." : `${hits.length} found.`}
  </p>
  {#each hits as hit, index (`${hit.path}-${hit.line}-${hit.kind}-${index}`)}
    <button type="button" on:click={() => void jumpToLine(app, hit.path, hit.line)}>
      {hit.kind} · {hit.text}
    </button>
  {/each}

  <h4>Book dictionary</h4>
  <p class="longform-archive-muted">Names and places are learned from the cards. A word you add stays on the project.</p>
  <button
    type="button"
    on:click={async () => {
      await addBookWord(app);
      reloadWords();
    }}>Add the selected word</button
  >
  {#each saved as word (word)}
    <p>
      {word}
      <button
        type="button"
        on:click={async () => {
          await removeBookWord(app, word);
          reloadWords();
        }}>Remove</button
      >
    </p>
  {/each}
  {#if names.length > 0}
    <p class="longform-archive-muted">From the cards: {names.join(", ")}</p>
  {/if}

  <h4>Portuguese</h4>
  <p class="longform-archive-muted">Syllables follow Portuguese vowel groups and diphthongs.</p>
  <div class="longform-archive-actions">
    <button type="button" on:click={countLine}>Count syllables</button>
    <button type="button" on:click={() => announcePage(app)}>Announce this page</button>
  </div>
  {#if syllables}<p aria-live="polite">{syllables}</p>{/if}

  <h4>Suggestions</h4>
  {#if suggestionsOn}
    <p class="longform-archive-muted">A reply is shown beside the page. It is not written into the manuscript.</p>
    <div class="longform-archive-actions">
      <button type="button" on:click={() => void askAboutPassage(app, "suggestion")}>Suggestion</button>
      <button type="button" on:click={() => void askAboutPassage(app, "critique")}>Critique</button>
    </div>
  {:else}
    <p class="longform-archive-muted">Suggestions are off. Turn them on in settings and set your own model address or key.</p>
  {/if}
</div>

<style>
  .longform-archive {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-archive-muted {
    color: var(--text-muted);
  }

  .longform-archive-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 100%;
    min-width: 0;
  }

  button,
  input {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
  }
</style>
