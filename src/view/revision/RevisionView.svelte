<script lang="ts">
  import { MarkdownView, TFile } from "obsidian";

  import {
    bringScene,
    decideProposal,
    emptyRevisionTrash,
    jumpToLine,
    keepMarkedHunk,
    pageErrands,
    pageTreatment,
    restoreTrashed,
    scenesToBring,
    showEarlierParagraph,
    toggleReader,
    undoMarkedHunk,
  } from "src/commands/revision";
  import { hunksBetween, wordDiff } from "src/model/revision";
  import type { ProseToggles } from "src/model/revision";
  import { proseToggles, revisionTick } from "src/model/revision-store";
  import { selectedDraft } from "src/model/stores";
  import { activeFile } from "src/view/stores";
  import { revisionLedger } from "src/view/revision-ledger";
  import { AskTextModal } from "./revision-modals";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let page = "";
  let fromId = "";
  let toId = "";

  function two(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }

  function clock(at: number): string {
    const date = new Date(at);
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(
      date.getHours()
    )}:${two(date.getMinutes())}`;
  }

  async function readPage(): Promise<void> {
    void $revisionTick;
    const file = $activeFile;
    if (!(file instanceof TFile)) {
      page = "";
      return;
    }
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file?.path === file.path) {
      page = view.editor.getValue();
      return;
    }
    page = await app.vault.cachedRead(file);
  }

  $: void readPage();
  $: path = $activeFile?.path ?? "";
  $: ledger = $revisionTick >= 0 ? revisionLedger() : null;
  $: versions = ledger && path ? ledger.versionsFor(path) : [];
  $: mark = ledger && path ? ledger.markFor(path) : null;
  $: changes = mark ? hunksBetween(mark.text, page) : [];
  $: left = versions.find((version) => version.id === fromId) ?? null;
  $: right = versions.find((version) => version.id === toId) ?? null;
  $: diff = left && right ? wordDiff(left.text, right.text) : [];
  $: waiting = ledger ? ledger.proposals.filter((item) => item.path === path && item.status === "pending") : [];
  $: errands = pageErrands(page);
  $: slips = pageTreatment(page, $selectedDraft?.title ?? "");
  $: bin = ledger
    ? ledger.trash.filter((piece) => piece.project === ($selectedDraft?.title ?? ""))
    : [];
  $: brought = $selectedDraft ? scenesToBring() : [];
  $: toggles = $proseToggles;

  function setToggle(key: keyof ProseToggles, value: boolean): void {
    ledger?.setProse({ ...toggles, [key]: value });
  }

  function nameVersion(): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file || !ledger) {
      return;
    }
    const filePath = view.file.path;
    const text = view.editor.getValue();
    new AskTextModal(app, "Name this version", "Closed", (name) => {
      if (name.trim().length === 0) {
        return;
      }
      ledger.note(filePath, text, name.trim());
      ledger.flush();
    }).open();
  }
</script>

<div class="longform-revision">
  <h3>Revision</h3>
  <p class="longform-revision-muted">
    Copies gather while you write. A named version stays. Nothing here rewrites the page until you accept it.
  </p>
  <div class="longform-revision-actions">
    <button type="button" on:click={nameVersion}>Name this version</button>
    <button type="button" on:click={() => showEarlierParagraph(app)}>Earlier paragraph</button>
    <button
      type="button"
      on:click={() => {
        const view = app.workspace.getActiveViewOfType(MarkdownView);
        if (view?.file && ledger) {
          ledger.setMark(view.file.path, view.editor.getValue());
          ledger.flush();
        }
      }}>Set mark</button
    >
    <button type="button" on:click={() => void toggleReader(app)}>Read as a reader</button>
  </div>

  <h4>Versions</h4>
  {#each versions as version (version.id)}
    <article>
      <p>{version.name || "While writing"} · {clock(version.at)}</p>
      <div class="longform-revision-actions">
        <button type="button" class:selected={fromId === version.id} on:click={() => (fromId = version.id)}
          >From</button
        >
        <button type="button" class:selected={toId === version.id} on:click={() => (toId = version.id)}
          >To</button
        >
      </div>
    </article>
  {/each}
  {#if diff.length > 0}
    <p class="longform-revision-diff">
      {#each diff as op, index (`${index}-${op.kind}`)}
        <span class={`longform-diff-${op.kind}`}>{op.text} </span>
      {/each}
    </p>
  {/if}

  <h4>Since the mark</h4>
  {#if !mark}
    <p class="longform-revision-muted">No mark on this page yet.</p>
  {:else}
    <p class="longform-revision-muted">Marked {clock(mark.at)}.</p>
    {#each changes as hunk, index (`${hunk.start}-${index}`)}
      <article>
        {#if hunk.before}<p class="longform-diff-cut">{hunk.before}</p>{/if}
        {#if hunk.after}<p class="longform-diff-add">{hunk.after}</p>{/if}
        <div class="longform-revision-actions">
          <button type="button" on:click={() => keepMarkedHunk(app, index)}>Keep</button>
          <button type="button" on:click={() => undoMarkedHunk(app, index)}>Undo</button>
        </div>
      </article>
    {/each}
  {/if}

  <h4>Proposals</h4>
  {#each waiting as proposal (proposal.id)}
    <article>
      <p class="longform-diff-cut">{proposal.original}</p>
      <p class="longform-diff-add">{proposal.replacement}</p>
      <div class="longform-revision-actions">
        <button type="button" on:click={() => decideProposal(app, proposal, true)}>Accept</button>
        <button type="button" on:click={() => decideProposal(app, proposal, false)}>Refuse</button>
      </div>
    </article>
  {/each}

  <h4>Prose</h4>
  <div class="longform-revision-actions">
    <button type="button" class:selected={toggles.echo} on:click={() => setToggle("echo", !toggles.echo)}
      >Echo</button
    >
    <button
      type="button"
      class:selected={toggles.longSentence}
      on:click={() => setToggle("longSentence", !toggles.longSentence)}>Long sentence</button
    >
    <button type="button" class:selected={toggles.cliche} on:click={() => setToggle("cliche", !toggles.cliche)}
      >Cliché</button
    >
    <button type="button" class:selected={toggles.adverb} on:click={() => setToggle("adverb", !toggles.adverb)}
      >Adverb</button
    >
    <button type="button" class:selected={toggles.onPage} on:click={() => setToggle("onPage", !toggles.onPage)}
      >Show on the page</button
    >
  </div>

  <h4>Treatment</h4>
  {#each slips as slip, index (`${slip.kind}-${index}`)}
    <p class="longform-revision-muted">{slip.kind}: {slip.detail}</p>
  {/each}

  <h4>Errands</h4>
  {#each errands as errand, index (`${errand.kind}-${errand.line}-${index}`)}
    <button type="button" on:click={() => path && void jumpToLine(app, path, errand.line)}>
      {errand.kind} · {errand.text}
    </button>
  {/each}

  <h4>Trash</h4>
  {#each bin as piece (piece.id)}
    <article>
      <p>{piece.title}</p>
      <button type="button" on:click={() => void restoreTrashed(app, piece.id)}>Restore</button>
    </article>
  {/each}
  {#if bin.length > 0}
    <button type="button" on:click={() => emptyRevisionTrash()}>Empty trash</button>
  {/if}

  <h4>Other drafts</h4>
  {#each brought as group (group.draft.vaultPath)}
    <p>{group.draft.draftTitle || group.draft.vaultPath}</p>
    {#each group.titles as title (title)}
      <button type="button" on:click={() => void bringScene(app, group.draft, title)}>Bring {title}</button>
    {/each}
  {/each}
</div>

<style>
  .longform-revision {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  article {
    margin: 0.45rem 0;
    min-width: 0;
  }

  .longform-revision-muted {
    color: var(--text-muted);
  }

  .longform-revision-actions {
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

  .longform-revision-diff {
    line-height: 1.5;
  }

  :global(.longform-diff-cut) {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  :global(.longform-diff-add) {
    color: var(--text-accent);
  }
</style>
