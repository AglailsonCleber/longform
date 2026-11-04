<script lang="ts">
  import {
    addContract,
    addVenue,
    buildEdition,
    editContest,
    editRights,
    editVenue,
    openFrozen,
    preparePiece,
    sendSubmission,
    setLink,
    setStatus,
  } from "src/commands/literary";
  import {
    overdueDeadlines,
    submissionsForProject,
    todayStamp,
    upcomingDeadlines,
    venueById,
    type Submission,
    type SubmissionStatus,
  } from "src/model/literary";
  import { literaryTick } from "src/model/literary-store";
  import { selectedDraft } from "src/model/stores";
  import { literaryLedger } from "src/view/literary-ledger";
  import { useApp } from "src/view/utils";

  const app = useApp();

  const STATUSES: SubmissionStatus[] = [
    "prepared",
    "sent",
    "reading",
    "accepted",
    "refused",
    "published",
  ];

  $: ledger = $literaryTick >= 0 ? literaryLedger() : null;
  $: project = $selectedDraft?.title ?? "";
  $: venues = ledger ? ledger.venues : [];
  $: submissions = ledger && project ? submissionsForProject(ledger.submissions, project) : [];
  $: contracts = ledger
    ? ledger.contracts.filter((contract) => contract.project === project)
    : [];
  $: editions = ledger
    ? ledger.editions.filter((edition) => edition.project === project)
    : [];
  $: upcoming =
    ledger && project
      ? upcomingDeadlines(submissionsForProject(ledger.submissions, project), todayStamp())
      : [];
  $: overdue =
    ledger && project
      ? overdueDeadlines(submissionsForProject(ledger.submissions, project), todayStamp())
      : [];

  function venueName(id: string): string {
    return venueById(venues, id)?.name ?? id;
  }

  function venueKind(id: string): string {
    return venueById(venues, id)?.kind ?? "";
  }

  function exclusiveLabel(submission: Submission): string {
    const venue = venueById(venues, submission.venueId);
    if (!venue) {
      return "";
    }
    return venue.simultaneous ? "simultaneous" : "exclusive";
  }
</script>

<div class="longform-life">
  <h3>Life</h3>
  <p class="longform-life-muted">
    Magazines, contests, publishers, agents, and columns. The draft keeps moving. What was sent stays frozen.
  </p>

  <h4>Venues</h4>
  <button type="button" on:click={() => addVenue(app)}>Add venue</button>
  {#each venues as venue (venue.id)}
    <article>
      <p>
        {venue.name} · {venue.kind} · {venue.simultaneous ? "simultaneous" : "exclusive"}
      </p>
      {#if venue.notes}<p class="longform-life-muted">{venue.notes}</p>{/if}
      <div class="longform-life-actions">
        <button type="button" on:click={() => editVenue(app, venue)}>Edit</button>
        <button type="button" on:click={() => void preparePiece(app, venue.id)}
          >Prepare this page</button
        >
      </div>
    </article>
  {/each}

  <h4>Submissions</h4>
  {#if submissions.length === 0}
    <p class="longform-life-muted">No submissions for this project yet.</p>
  {/if}
  {#each submissions as submission (submission.id)}
    <article>
      <p>
        {submission.pieceTitle} → {venueName(submission.venueId)} · {submission.status} ·
        {exclusiveLabel(submission)}
      </p>
      <p class="longform-life-muted">{venueKind(submission.venueId)}</p>
      {#if submission.contest.deadline}
        <p class="longform-life-muted">
          Deadline {submission.contest.deadline}
          {#if submission.contest.fee} · fee {submission.contest.fee}{/if}
        </p>
      {/if}
      {#if submission.rights.first || submission.rights.exclusiveUntil || submission.rights.republishFrom}
        <p class="longform-life-muted">
          {#if submission.rights.first}First publication. {/if}
          {#if submission.rights.exclusiveUntil}Exclusive until {submission.rights.exclusiveUntil}. {/if}
          {#if submission.rights.republishFrom}Republication from {submission.rights.republishFrom}.{/if}
        </p>
      {/if}
      {#if submission.publishedUrl}
        <p><a href={submission.publishedUrl}>{submission.publishedUrl}</a></p>
      {/if}
      <div class="longform-life-actions">
        {#if submission.status === "prepared"}
          <button type="button" on:click={() => void sendSubmission(app, submission.id)}
            >Freeze and mark sent</button
          >
        {/if}
        {#each STATUSES as status (status)}
          {#if status !== submission.status}
            <button type="button" on:click={() => setStatus(app, submission.id, status)}
              >{status}</button
            >
          {/if}
        {/each}
        <button type="button" on:click={() => editRights(app, submission.id)}>Rights</button>
        <button type="button" on:click={() => editContest(app, submission.id)}>Deadline</button>
        <button type="button" on:click={() => setLink(app, submission.id)}>Stable link</button>
        {#if submission.frozenPath}
          <button type="button" on:click={() => void openFrozen(app, submission.id)}
            >Open frozen copy</button
          >
        {/if}
        <button
          type="button"
          on:click={() => {
            ledger?.dropSubmission(submission.id);
            ledger?.flush();
          }}>Drop</button
        >
      </div>
    </article>
  {/each}

  <h4>Deadlines</h4>
  {#if upcoming.length === 0 && overdue.length === 0}
    <p class="longform-life-muted">No contest dates on this project.</p>
  {/if}
  {#each upcoming as submission (submission.id)}
    <p>
      {submission.pieceTitle} · {submission.contest.deadline}
      {#if submission.contest.rules}
        · {submission.contest.rules}{/if}
    </p>
  {/each}
  {#each overdue as submission (submission.id)}
    <p class="longform-life-warn">
      Overdue · {submission.pieceTitle} · {submission.contest.deadline}
    </p>
  {/each}

  <h4>Contracts</h4>
  <button type="button" on:click={() => addContract(app)}>Record a contract</button>
  {#each contracts as contract (contract.id)}
    <article>
      <p>{contract.pieceTitle} · {contract.with}</p>
      <p class="longform-life-muted">
        {contract.amount}{#if contract.when} · {contract.when}{/if}
        {#if contract.note} · {contract.note}{/if}
      </p>
      <button
        type="button"
        on:click={() => {
          ledger?.dropContract(contract.id);
          ledger?.flush();
        }}>Drop</button
      >
    </article>
  {/each}

  <h4>Cover and EPUB</h4>
  <p class="longform-life-muted">
    For self-publishing. A publisher can ignore this. The cover image stays separate from the body.
  </p>
  <button type="button" on:click={() => buildEdition(app)}>Build cover and EPUB</button>
  {#each editions as edition (edition.id)}
    <p class="longform-life-muted">{edition.title} · {edition.epubPath}</p>
  {/each}
</div>

<style>
  .longform-life {
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

  .longform-life-muted {
    color: var(--text-muted);
  }

  .longform-life-warn {
    color: var(--text-accent);
  }

  .longform-life-actions {
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
</style>
