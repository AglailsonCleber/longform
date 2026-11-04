<script lang="ts">
  import { TFile } from "obsidian";

  import {
    beginSprint,
    editProjectGoal,
    selectionOrPageText,
    sprintLabel,
    stopSprint,
  } from "src/commands/habit";
  import {
    countWordsSimple,
    dayStamp,
    longestRun,
    monthGrid,
    projectGoalFromFrontmatter,
    projectProgress,
    readingMinutes,
    recentRun,
    unitLabel,
    writingDays,
  } from "src/model/habit";
  import { habitTick, sprint, writingSeconds } from "src/model/habit-store";
  import {
    draftWordCounts,
    pluginSettings,
    selectedDraft,
    sessions,
  } from "src/model/stores";
  import { goalProgress, sessionUnitProgress } from "src/view/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  $: void $habitTick;
  $: unit = $pluginSettings.sessionGoalUnit ?? "words";
  $: goal = $pluginSettings.sessionGoal;
  $: days = writingDays($sessions);
  $: today = dayStamp(new Date());
  $: now = new Date();
  $: grid = monthGrid(now.getFullYear(), now.getMonth() + 1, days);
  $: run = recentRun(days, today);
  $: longest = longestRun(days);
  $: minutesWritten = Math.floor($writingSeconds / 60);
  $: secondsWritten = $writingSeconds % 60;

  $: projectGoal = (() => {
    const draft = $selectedDraft;
    if (!draft) {
      return null;
    }
    const index = app.vault.getAbstractFileByPath(draft.vaultPath);
    if (!(index instanceof TFile)) {
      return null;
    }
    return projectGoalFromFrontmatter(
      app.metadataCache.getFileCache(index)?.frontmatter
    );
  })();

  $: manuscriptWords = (() => {
    const draft = $selectedDraft;
    if (!draft || !$draftWordCounts) {
      return 0;
    }
    const counts = $draftWordCounts[draft.vaultPath];
    if (typeof counts === "number") {
      return counts;
    }
    if (!counts) {
      return 0;
    }
    let total = 0;
    for (const key of Object.keys(counts)) {
      total += counts[key] ?? 0;
    }
    return total;
  })();

  $: manuscriptChapters =
    $selectedDraft?.format === "scenes" ? $selectedDraft.scenes.length : 1;

  $: projectCurrent = projectGoal
    ? projectGoal.unit === "chapters"
      ? manuscriptChapters
      : manuscriptWords
    : 0;

  $: projectState = projectGoal
    ? projectProgress(projectCurrent, projectGoal)
    : null;

  $: readerWords = countWordsSimple(selectionOrPageText(app));
  $: readerMinutes = readingMinutes(
    readerWords,
    $pluginSettings.readingWordsPerMinute || 200
  );

  $: sessionProduced =
    unit === "minutes"
      ? minutesWritten + secondsWritten / 60
      : unit === "lines" || unit === "stanzas"
        ? $sessionUnitProgress
        : Math.round($goalProgress * goal);

  $: sprintText = $sprint ? sprintLabel() : "";

  function sessionPercent(): number {
    return Math.min(100, Math.round(Math.min($goalProgress, 1) * 100));
  }
</script>

<div class="longform-habit">
  <h3>Habit</h3>
  <p class="longform-habit-muted">
    The goal speaks the unit of the craft. Words for the novel. Lines or stanzas for the poem. A deadline for the chronicle.
  </p>

  <h4>Session goal</h4>
  <p>
    {Math.floor(sessionProduced * (unit === "minutes" ? 10 : 1)) /
      (unit === "minutes" ? 10 : 1)}
    / {goal}
    {unitLabel(unit)}
  </p>
  <div class="longform-habit-bar" title={`${sessionPercent()}%`}>
    <div class="longform-habit-bar-fill" style={`width:${sessionPercent()}%;`} />
  </div>
  <p class="longform-habit-muted">
    Change the unit in settings: words, minutes, lines, or stanzas. The session notifies when the goal arrives.
  </p>
  {#if unit === "minutes"}
    <p class="longform-habit-muted">
      Writing clock: {minutesWritten}:{secondsWritten < 10 ? `0${secondsWritten}` : secondsWritten}
    </p>
  {/if}

  <h4>Project goal</h4>
  <p class="longform-habit-muted">
    Separate from today's session. Eighty thousand words of a novel do not compete with a chronicle due Thursday.
  </p>
  {#if projectGoal && projectState}
    <p>
      {projectCurrent} / {projectGoal.amount} {unitLabel(projectGoal.unit)}
      {#if projectGoal.due} · due {projectGoal.due}{/if}
    </p>
    <p class="longform-habit-muted">{projectState.remaining} remaining</p>
  {:else}
    <p class="longform-habit-muted">No project goal on this index yet.</p>
  {/if}
  <button type="button" on:click={() => editProjectGoal(app)}>Set project goal</button>

  <h4>Sprint</h4>
  <p class="longform-habit-muted">A short clock to begin. Optional. No ranking.</p>
  <div class="longform-habit-actions">
    <button type="button" on:click={() => beginSprint(app, 5 * 60)}>5 min</button>
    <button type="button" on:click={() => beginSprint(app, 10 * 60)}>10 min</button>
    <button type="button" on:click={() => beginSprint(app, 25 * 60)}>25 min</button>
    {#if $sprint}
      <button type="button" on:click={() => stopSprint()}>Stop · {sprintText}</button>
    {/if}
  </div>

  <h4>Calendar</h4>
  <p class="longform-habit-muted">
    Days with text are marked. A pause is an empty square, not a punishment. Recent run: {run}. Longest run kept: {longest}.
  </p>
  <div class="longform-habit-calendar">
    {#each grid as cell (cell.stamp)}
      <span
        class="longform-habit-day"
        class:written={cell.words > 0}
        class:today={cell.stamp === today}
        title={cell.words > 0 ? `${cell.stamp}: ${cell.words} words` : cell.stamp}
        >{cell.day}</span
      >
    {/each}
  </div>

  <h4>Counts</h4>
  <p class="longform-habit-muted">
    Project, draft, and scene counts stay in the status bar and Project tab. Research is not added in.
  </p>
  <p>Manuscript words: {manuscriptWords}</p>

  <h4>Reading time</h4>
  <p class="longform-habit-muted">
    For the reader of the open page or selection — not the words you produced in this session.
  </p>
  <p>{readerWords} words · about {readerMinutes} min to read</p>
</div>

<style>
  .longform-habit {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-habit-muted {
    color: var(--text-muted);
  }

  .longform-habit-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .longform-habit-bar {
    height: 0.55rem;
    background: var(--background-modifier-border);
    border-radius: 3px;
    overflow: hidden;
    max-width: 100%;
  }

  .longform-habit-bar-fill {
    height: 100%;
    background: var(--text-accent);
  }

  .longform-habit-calendar {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem;
    max-width: 100%;
  }

  .longform-habit-day {
    text-align: center;
    font-size: 0.75rem;
    padding: 0.2rem 0;
    color: var(--text-muted);
    border-radius: 3px;
  }

  .longform-habit-day.written {
    background: var(--text-accent);
    color: var(--text-on-accent);
  }

  .longform-habit-day.today {
    outline: 1px solid var(--text-normal);
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
