<script lang="ts">
  import { Notice, TFile, normalizePath } from "obsidian";

  import { captureFolder, createCapture } from "src/commands/capture-files";
  import { startDictation } from "src/commands/dictation";
  import {
    CAPTURE_KEY,
    exerciseProgress,
    inboxCaptures,
    projectCaptures,
    todayStamp,
    type CaptureKind,
    type CaptureNote,
    type ExerciseForm,
  } from "src/model/capture";
  import { captures } from "src/model/capture-store";
  import { draftForPath } from "src/model/scene-navigation";
  import { drafts, selectedDraft } from "src/model/stores";
  import { activeFile } from "src/view/stores";
  import { useApp } from "src/view/utils";

  import { ClippingModal, ObservationModal, PassageModal } from "./capture-modals";

  const app = useApp();

  const kindLabel: Record<CaptureKind, string> = {
    fragment: "Fragments",
    observation: "Observations",
    title: "Titles",
    exercise: "Exercises",
    clipping: "Clippings",
    dictation: "Dictation",
    research: "Research",
    question: "Questions",
    fact: "Facts to check",
  };

  const projectKinds: CaptureKind[] = [
    "fragment",
    "observation",
    "title",
    "exercise",
    "clipping",
    "dictation",
    "research",
    "question",
    "fact",
  ];

  let bodies: Record<string, string> = {};

  $: title = $selectedDraft?.title ?? "";
  $: inbox = inboxCaptures($captures);
  $: mine = projectCaptures($captures, title);
  $: openScene =
    $activeFile && draftForPath($activeFile.path, $drafts) ? $activeFile : null;

  async function loadBodies(notes: CaptureNote[]): Promise<void> {
    const next: Record<string, string> = {};
    for (const note of notes) {
      if (note.kind !== "exercise") {
        continue;
      }
      const file = app.vault.getAbstractFileByPath(note.path);
      if (file instanceof TFile) {
        next[note.path] = await app.vault.cachedRead(file);
      }
    }
    bodies = next;
  }

  $: void loadBodies($captures);

  function place(): { project: string; folder: string } {
    const draft = $selectedDraft;
    if (!draft) {
      return { project: "", folder: "Captura" };
    }
    return { project: draft.title, folder: captureFolder(draft) };
  }

  async function keep(note: Parameters<typeof createCapture>[1]): Promise<void> {
    const folder = note.project.length === 0 ? "Captura" : place().folder;
    const file = await createCapture(app, note, folder);
    await app.workspace.getLeaf(false).openFile(file);
  }

  function askText(kind: CaptureKind, heading: string): void {
    const spot = place();
    new PassageModal(app, heading, heading, (text) => {
      void keep({ kind, project: spot.project, text });
    }).open();
  }

  function exercise(form: ExerciseForm, goal: number, goalUnit: "words" | "lines" | ""): void {
    const spot = place();
    void keep({
      kind: "exercise",
      project: spot.project,
      text: "",
      form,
      goal,
      goalUnit,
    });
  }

  function openPath(path: string): void {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      void app.workspace.getLeaf(false).openFile(file);
    }
  }

  async function assign(note: CaptureNote): Promise<void> {
    const draft = $selectedDraft;
    const file = app.vault.getAbstractFileByPath(note.path);
    if (!draft || !(file instanceof TFile)) {
      return;
    }
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      const raw = frontmatter[CAPTURE_KEY];
      if (raw && typeof raw === "object") {
        raw.project = draft.title;
      }
    });
    const folder = captureFolder(draft);
    if (!app.vault.getAbstractFileByPath(folder)) {
      await app.vault.createFolder(folder);
    }
    const dest = normalizePath(`${folder}/${file.name}`);
    if (file.path !== dest && !app.vault.getAbstractFileByPath(dest)) {
      await app.vault.rename(file, dest);
    }
  }

  async function useInScene(note: CaptureNote): Promise<void> {
    const scene = openScene;
    const file = app.vault.getAbstractFileByPath(note.path);
    if (!scene || !(file instanceof TFile)) {
      new Notice("Open a scene to link this note.");
      return;
    }
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      const raw = frontmatter[CAPTURE_KEY];
      if (raw && typeof raw === "object") {
        raw.usedIn = scene.path;
      }
    });
  }

  function detail(note: CaptureNote): string {
    if (note.kind === "observation") {
      return [note.seen, note.where].filter((part) => part.length > 0).join(" · ");
    }
    if (note.kind === "clipping") {
      return [note.source.work, note.source.page, note.source.date]
        .filter((part) => part.length > 0)
        .join(" · ");
    }
    if (note.kind === "exercise") {
      const progress = exerciseProgress(bodies[note.path] ?? "", note);
      if (progress.goal > 0 && progress.unit.length > 0) {
        return `${note.form} · ${progress.count} / ${progress.goal} ${progress.unit}`;
      }
      return note.form;
    }
    if (note.usedIn.length > 0) {
      return `Used in ${note.usedIn}`;
    }
    if (note.bornFrom.length > 0) {
      return `From ${note.bornFrom}`;
    }
    return "";
  }
</script>

<div class="longform-capture">
  <h3>Capture</h3>
  <p class="longform-capture-muted">
    Inbox notes have no project yet. Research kept in a project stays out of the manuscript.
  </p>
  <div class="longform-capture-actions">
    <button
      type="button"
      on:click={() => {
        new PassageModal(app, "Inbox", "A phrase, a line, an image", (text) => {
          void keep({ kind: "fragment", project: "", text });
        }).open();
      }}>Inbox</button
    >
    <button type="button" on:click={() => askText("fragment", "Fragment")}>Fragment</button>
    <button
      type="button"
      on:click={() => {
        const spot = place();
        new ObservationModal(app, (fields) => {
          void keep({
            kind: "observation",
            project: spot.project,
            text: fields.text,
            where: fields.where,
            seen: todayStamp(new Date()),
          });
        }).open();
      }}>Observation</button
    >
    <button type="button" on:click={() => askText("title", "Title")}>Title</button>
    <button type="button" on:click={() => exercise("sonnet", 14, "lines")}>Sonnet</button>
    <button type="button" on:click={() => exercise("flash", 500, "words")}>Flash</button>
    <button type="button" on:click={() => exercise("column", 0, "")}>Column</button>
    <button
      type="button"
      on:click={() => {
        const spot = place();
        new ClippingModal(app, (fields) => {
          void keep({
            kind: "clipping",
            project: spot.project,
            text: fields.text,
            work: fields.work,
            page: fields.page,
            url: fields.url,
          });
        }).open();
      }}>Clipping</button
    >
    <button type="button" on:click={() => askText("research", "Research")}>Research</button>
    <button type="button" on:click={() => void startDictation(app, $selectedDraft)}
      >Dictate</button
    >
  </div>

  <h4>Inbox</h4>
  {#if inbox.length === 0}
    <p class="longform-capture-muted">Nothing waiting.</p>
  {:else}
    {#each inbox as note (note.path)}
      <article>
        <button type="button" class="longform-capture-open" on:click={() => openPath(note.path)}>
          {note.kind}: {note.path.split("/").pop()}
        </button>
        {#if detail(note)}
          <p class="longform-capture-muted">{detail(note)}</p>
        {/if}
        {#if title}
          <button type="button" on:click={() => void assign(note)}>Keep in {title}</button>
        {/if}
        <button type="button" on:click={() => void useInScene(note)}>Used in the open scene</button>
      </article>
    {/each}
  {/if}

  {#if title}
    <h4>{title}</h4>
    {#each projectKinds as kind (kind)}
      {@const list = mine.filter((note) => note.kind === kind)}
      {#if list.length > 0}
        <h4>{kindLabel[kind]}</h4>
        {#each list as note (note.path)}
          <article>
            <button type="button" class="longform-capture-open" on:click={() => openPath(note.path)}>
              {note.path.split("/").pop()}
            </button>
            {#if detail(note)}
              <p class="longform-capture-muted">{detail(note)}</p>
            {/if}
            {#if note.source.url}
              <p class="longform-capture-muted">{note.source.url}</p>
            {/if}
            <button type="button" on:click={() => void useInScene(note)}>Used in the open scene</button>
          </article>
        {/each}
      {/if}
    {/each}
  {/if}
</div>

<style>
  .longform-capture {
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

  .longform-capture-muted {
    color: var(--text-muted);
  }

  .longform-capture-actions {
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
