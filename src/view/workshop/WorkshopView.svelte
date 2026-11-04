<script lang="ts">
  import {
    answerBetaQuestion,
    askBetaQuestion,
    commentOnPassage,
    decideWorkshopSuggestion,
    enterSwapQueue,
    inviteReader,
    listForSwap,
    markAttentionDrop,
    markSwapRead,
    openFrozenWorkshop,
    openWorkshopRound,
    proposeWorkshopChange,
    replyToThread,
    setDeadlines,
  } from "src/commands/workshop";
  import {
    attentionForWorkshop,
    filterSwapQueue,
    phaseOf,
    repliesTo,
    rolePowers,
    todayStamp,
    visibleThreads,
    workshopsForProject,
  } from "src/model/workshop";
  import { workshopTick } from "src/model/workshop-store";
  import { selectedDraft } from "src/model/stores";
  import { workshopLedger } from "src/view/workshop-ledger";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let viewerId = "author";
  let genreFilter = "";
  let minWords = 0;
  let maxWords = 100000;

  $: ledger = $workshopTick >= 0 ? workshopLedger() : null;
  $: project = $selectedDraft?.title ?? "";
  $: rounds = ledger && project ? workshopsForProject(ledger.workshops, project) : [];
  $: active = rounds.find((round) => round.status === "open") ?? rounds[0] ?? null;
  $: phase = active ? phaseOf(active, todayStamp()) : "closed";
  $: threads =
    ledger && active
      ? visibleThreads(active, ledger.threads, viewerId, todayStamp()).filter(
          (thread) => thread.parentId.length === 0
        )
      : [];
  $: suggestions = ledger && active
    ? ledger.suggestions.filter(
        (item) => item.workshopId === active.id && item.status === "pending"
      )
    : [];
  $: questions =
    ledger && active
      ? ledger.questions.filter((item) => item.workshopId === active.id)
      : [];
  $: drops =
    ledger && active ? attentionForWorkshop(ledger.attention, active.id) : [];
  $: swaps = ledger
    ? filterSwapQueue(ledger.swaps, genreFilter, minWords, maxWords)
    : [];
  $: mySwap = ledger
    ? ledger.swaps.find((item) => item.project === project)
    : null;
</script>

<div class="longform-workshop">
  <h3>Workshop</h3>
  <p class="longform-workshop-muted">
    Comment on the passage, keep deadlines, and freeze the file the others read. The author decides what enters the draft.
  </p>
  <div class="longform-workshop-actions">
    <button type="button" on:click={() => void openWorkshopRound(app)}
      >Open a workshop round</button
    >
    <button type="button" on:click={() => listForSwap(app)}>Register for reading swap</button>
  </div>

  {#if !active}
    <p class="longform-workshop-muted">No workshop round on this project yet.</p>
  {:else}
    <h4>{active.title} · {active.pieceTitle}</h4>
    <p class="longform-workshop-muted">
      Phase: {phase}
      {#if active.critiqueUntil} · critique until {active.critiqueUntil}{/if}
      {#if active.questionsUntil} · questions until {active.questionsUntil}{/if}
      {#if active.hideCritiques} · critiques hidden until delivered{/if}
    </p>
    <div class="longform-workshop-actions">
      <button type="button" on:click={() => void openFrozenWorkshop(app, active.id)}
        >Open frozen copy</button
      >
      <button type="button" on:click={() => inviteReader(app, active.id)}>Invite</button>
      <button type="button" on:click={() => setDeadlines(app, active.id)}>Deadlines</button>
      <button type="button" on:click={() => commentOnPassage(app, active.id)}
        >Comment on selection</button
      >
      <button type="button" on:click={() => proposeWorkshopChange(app, active.id)}
        >Suggest a change</button
      >
      <button type="button" on:click={() => askBetaQuestion(app, active.id)}
        >Ask the betas</button
      >
      <button type="button" on:click={() => markAttentionDrop(app, active.id)}
        >Where reading cooled</button
      >
      <button
        type="button"
        on:click={() => {
          ledger?.closeWorkshop(active.id);
          ledger?.flush();
        }}>Close round</button
      >
    </div>

    <h4>Roles</h4>
    {#each active.invites as invite (invite.id)}
      <p>
        {invite.name} · {invite.role}
        <span class="longform-workshop-muted">
          · {rolePowers(invite.role).canEdit
            ? "edit"
            : rolePowers(invite.role).canSuggest
              ? "suggest"
              : "comment"}
        </span>
        <button
          type="button"
          on:click={() => {
            ledger?.removeInvite(active.id, invite.id);
            ledger?.flush();
          }}>Remove</button
        >
      </p>
    {/each}
    {#if active.invites.length === 0}
      <p class="longform-workshop-muted">Invite a coauthor, editor, beta, or sensitivity reader.</p>
    {/if}

    <h4>View as</h4>
    <div class="longform-workshop-actions">
      <button type="button" class:selected={viewerId === "author"} on:click={() => (viewerId = "author")}
        >Author</button
      >
      {#each active.invites as invite (invite.id)}
        <button
          type="button"
          class:selected={viewerId === invite.id}
          on:click={() => (viewerId = invite.id)}>{invite.name}</button
        >
      {/each}
    </div>

    <h4>Conversation on the passage</h4>
    {#each threads as thread (thread.id)}
      <article>
        <p class="longform-workshop-passage">{thread.passage}</p>
        <p>
          <strong>{thread.readerName}</strong>
          {#if thread.critique} · critique{/if}
          · {thread.text}
        </p>
        {#each ledger ? repliesTo(ledger.threads, thread.id) : [] as reply (reply.id)}
          <p class="longform-workshop-reply">
            {reply.readerName}: {reply.text}
          </p>
        {/each}
        <button type="button" on:click={() => replyToThread(app, active.id, thread.id, thread.passage)}
          >Reply</button
        >
      </article>
    {/each}
    {#if threads.length === 0}
      <p class="longform-workshop-muted">
        {#if active.hideCritiques && viewerId !== "author"}
          Critiques stay hidden until this reader delivers their own.
        {:else}
          No comments on this round yet.
        {/if}
      </p>
    {/if}

    <h4>Suggestions</h4>
    {#each suggestions as suggestion (suggestion.id)}
      <article>
        <p class="longform-workshop-muted">{suggestion.readerName}</p>
        <p class="longform-diff-cut">{suggestion.original}</p>
        <p class="longform-diff-add">{suggestion.replacement}</p>
        <div class="longform-workshop-actions">
          <button
            type="button"
            on:click={() => void decideWorkshopSuggestion(app, suggestion, true)}>Accept</button
          >
          <button
            type="button"
            on:click={() => void decideWorkshopSuggestion(app, suggestion, false)}>Refuse</button
          >
        </div>
      </article>
    {/each}
    {#if suggestions.length === 0}
      <p class="longform-workshop-muted">No pending suggestions. Accepting one changes the live draft only.</p>
    {/if}

    <h4>Questions for the betas</h4>
    {#each questions as question (question.id)}
      <article>
        <p>{question.prompt}</p>
        {#each question.answers as answer (`${answer.readerId}-${answer.at}`)}
          <p class="longform-workshop-reply">{answer.readerName}: {answer.text}</p>
        {/each}
        <button
          type="button"
          on:click={() => answerBetaQuestion(app, active.id, question.id, question.prompt)}
          >Answer</button
        >
      </article>
    {/each}

    <h4>Where reading cooled</h4>
    {#if drops.length === 0}
      <p class="longform-workshop-muted">Only shown when the reader consents.</p>
    {/if}
    {#each drops as drop (drop.id)}
      <p>{drop.readerName} · {drop.passage}</p>
    {/each}
  {/if}

  <h4>Reading swap</h4>
  <p class="longform-workshop-muted">
    To enter the queue, read someone else's piece first. Genre and length filter what you see.
  </p>
  {#if mySwap}
    <p class="longform-workshop-muted">
      Your credit: {mySwap.credit}
      {#if mySwap.seeking} · seeking readers{/if}
    </p>
    <button type="button" on:click={() => enterSwapQueue(app, mySwap.id)}>Enter the queue</button>
  {/if}
  <div class="longform-workshop-actions">
    <input bind:value={genreFilter} placeholder="Genre filter" />
    <input type="number" bind:value={minWords} title="Min words" />
    <input type="number" bind:value={maxWords} title="Max words" />
  </div>
  {#each swaps as listing (listing.id)}
    <article>
      <p>{listing.pieceTitle} · {listing.genre} · {listing.words} words</p>
      <button type="button" on:click={() => markSwapRead(app, listing.id)}
        >I read this</button
      >
    </article>
  {/each}
</div>

<style>
  .longform-workshop {
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

  .longform-workshop-muted {
    color: var(--text-muted);
  }

  .longform-workshop-passage {
    font-style: italic;
  }

  .longform-workshop-reply {
    margin-left: 0.6rem;
    color: var(--text-muted);
  }

  .longform-workshop-actions {
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

  button.selected {
    color: var(--text-accent);
  }

  :global(.longform-diff-cut) {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  :global(.longform-diff-add) {
    color: var(--text-accent);
  }
</style>
