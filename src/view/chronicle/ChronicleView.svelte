<script lang="ts">
  import { MarkdownView, TFile } from "obsidian";
  import { onMount } from "svelte";

  import {
    editFactSheet,
    editPersona,
    linkPaperAndBook,
    markRealPeople,
    recordPublication,
    setColumnCadence,
    setDeliveryDue,
    setRecurringNarrator,
    setSeriesAndDesk,
    setVehicleCeiling,
  } from "src/commands/chronicle";
  import { craftTick } from "src/model/craft-store";
  import {
    ceilingCheck,
    chronicleFromFrontmatter,
    columnCalendar,
    dueSoon,
    filterByVenue,
    holesInCalendar,
  } from "src/model/chronicle";
  import { dayStamp } from "src/model/habit";
  import { scenePath } from "src/model/scene-navigation";
  import { selectedDraft } from "src/model/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  let text = "";
  let path = "";
  let venueFilter = "";
  let deskFilter = "";
  let publishedFilter = "";
  let archive: (ReturnType<typeof chronicleFromFrontmatter> & {
    path: string;
    title: string;
  })[] = [];
  let calendar: ReturnType<typeof columnCalendar> = [];

  $: void $craftTick;
  $: sheet = (() => {
    void $craftTick;
    if (!path) {
      return chronicleFromFrontmatter(null);
    }
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return chronicleFromFrontmatter(null);
    }
    return chronicleFromFrontmatter(
      app.metadataCache.getFileCache(file)?.frontmatter
    );
  })();
  $: check = ceilingCheck(text, sheet);
  $: today = dayStamp(new Date());
  $: dueAlert = dueSoon(sheet.due, today, 3);
  $: holes = holesInCalendar(calendar);
  $: filtered = filterByVenue(archive, {
    venue: venueFilter,
    desk: deskFilter,
    published: publishedFilter,
  });

  async function refresh(): Promise<void> {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    path = view?.file?.path ?? "";
    text = view?.editor.getValue() ?? "";
    const draft = $selectedDraft;
    if (!draft) {
      archive = [];
      calendar = [];
      return;
    }
    const pieces: {
      path: string;
      title: string;
      written: string;
      published: string;
      sheet: ReturnType<typeof chronicleFromFrontmatter>;
    }[] = [];
    const push = async (filePath: string, title: string) => {
      const file = app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return;
      }
      const fm = app.metadataCache.getFileCache(file)?.frontmatter;
      const piece = chronicleFromFrontmatter(fm);
      pieces.push({
        path: file.path,
        title,
        written: piece.written,
        published: piece.published,
        sheet: piece,
      });
    };
    if (draft.format === "single") {
      await push(draft.vaultPath, draft.title);
    } else {
      for (const scene of draft.scenes) {
        await push(scenePath(scene.title, draft, app.vault), scene.title);
      }
    }
    archive = pieces.map((piece) => ({
      ...piece.sheet,
      path: piece.path,
      title: piece.title,
    }));
    const cadence = sheet.cadence || pieces[0]?.sheet.cadence || "weekly";
    const start =
      pieces.map((piece) => piece.published || piece.written).filter(Boolean).sort()[0] ||
      today;
    calendar = columnCalendar(
      cadence === "once" ? "weekly" : cadence,
      start,
      8,
      pieces
    );
  }

  onMount(() => {
    void refresh();
    const a = app.workspace.on("active-leaf-change", () => void refresh());
    const b = app.workspace.on("editor-change", () => void refresh());
    return () => {
      app.workspace.offref(a);
      app.workspace.offref(b);
    };
  });
</script>

<div class="longform-chronicle">
  <h3>Chronicle</h3>
  <p class="longform-chronicle-muted">
    A chronicle has a deadline, a venue, a fact, and a voice that returns each week. It does not need a novel arc.
  </p>

  <h4>Column calendar</h4>
  <p class="longform-chronicle-muted">
    Weekly, biweekly, or one-off. Holes in the grid show before the editor asks.
  </p>
  <div class="longform-chronicle-actions">
    <button type="button" on:click={() => setColumnCadence(app, "weekly")}>Weekly</button>
    <button type="button" on:click={() => setColumnCadence(app, "biweekly")}
      >Biweekly</button
    >
    <button type="button" on:click={() => setColumnCadence(app, "once")}>One-off</button>
    <button type="button" on:click={() => setSeriesAndDesk(app)}>Series & desk</button>
  </div>
  <div class="longform-chronicle-grid">
    {#each calendar as slot (slot.stamp)}
      <span class:hole={!slot.filled} title={slot.title || slot.stamp}
        >{slot.stamp.slice(5)}{slot.filled ? "" : " ·"}</span
      >
    {/each}
  </div>
  {#if holes.length > 0}
    <p class="longform-chronicle-muted">{holes.length} open slot{holes.length === 1 ? "" : "s"}.</p>
  {/if}

  <h4>Vehicle ceiling</h4>
  <p class="longform-chronicle-muted">
    Words, characters, or pages for the paper, magazine, or site. The piece warns when it runs over.
  </p>
  <button type="button" on:click={() => setVehicleCeiling(app)}>Set ceiling</button>
  <p>
    {check.current} / {check.ceiling || "—"} {check.unit}
    {#if check.over} · over{/if}
  </p>

  <h4>Delivery due</h4>
  <p class="longform-chronicle-muted">
    Date and alert per chronicle, apart from today’s word goal.
  </p>
  <button type="button" on:click={() => setDeliveryDue(app)}>Set due date</button>
  <p>
    {sheet.due || "No due date"}
    {#if dueAlert} · due soon{/if}
  </p>

  <h4>Stable persona</h4>
  <button type="button" on:click={() => editPersona(app)}>Edit persona</button>
  {#if sheet.persona.tone || sheet.persona.address || sheet.persona.notices}
    <p>
      {sheet.persona.tone}
      {#if sheet.persona.address} · {sheet.persona.address}{/if}
    </p>
    <p class="longform-chronicle-muted">{sheet.persona.notices}</p>
  {/if}

  <h4>Fact sheet</h4>
  <button type="button" on:click={() => editFactSheet(app)}>Edit fact sheet</button>
  {#if sheet.fact.date || sheet.fact.place || sheet.fact.seen}
    <p>{[sheet.fact.date, sheet.fact.place].filter(Boolean).join(" · ")}</p>
    <p class="longform-chronicle-muted">Seen: {sheet.fact.seen || "—"}</p>
    <p class="longform-chronicle-muted">Invented: {sheet.fact.invented || "—"}</p>
  {/if}

  <h4>Paper and book versions</h4>
  <button type="button" on:click={() => linkPaperAndBook(app)}>Link versions</button>
  {#if sheet.paperVersion || sheet.bookVersion}
    <p class="longform-chronicle-muted">
      Paper: {sheet.paperVersion || "—"} · Book: {sheet.bookVersion || "—"}
    </p>
  {/if}

  <h4>Archive by venue</h4>
  <div class="longform-chronicle-fields">
    <input type="text" placeholder="Venue" bind:value={venueFilter} />
    <input type="text" placeholder="Desk" bind:value={deskFilter} />
    <input type="text" placeholder="Published (YYYY)" bind:value={publishedFilter} />
  </div>
  {#each filtered as piece (piece.path)}
    <p>
      {piece.title}
      {#if piece.venue} · {piece.venue}{/if}
      {#if piece.published} · {piece.published}{/if}
    </p>
  {/each}

  <h4>Real people check</h4>
  <button type="button" on:click={() => markRealPeople(app)}>Mark names</button>
  {#if sheet.realPeople.length > 0}
    <p class="longform-chronicle-muted">{sheet.realPeople.join(" · ")}</p>
  {/if}

  <h4>Recurring narrator</h4>
  <button type="button" on:click={() => setRecurringNarrator(app)}>Set narrator</button>
  {#if sheet.narrator}
    <p>{sheet.narrator}</p>
  {/if}

  <h4>Original date kept</h4>
  <button type="button" on:click={() => recordPublication(app)}>Record publication</button>
  <p class="longform-chronicle-muted">
    First: {sheet.firstPublished || "—"}
    {#if sheet.firstVenue} at {sheet.firstVenue}{/if}
    · Latest: {sheet.published || "—"}
    {#if sheet.venue} at {sheet.venue}{/if}
  </p>
</div>

<style>
  .longform-chronicle {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p {
    margin: 0.35rem 0;
  }

  .longform-chronicle-muted {
    color: var(--text-muted);
  }

  .longform-chronicle-actions,
  .longform-chronicle-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .longform-chronicle-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
    font-size: 0.75rem;
  }

  .longform-chronicle-grid .hole {
    color: var(--text-muted);
    outline: 1px dashed var(--background-modifier-border);
  }

  input {
    min-width: 0;
    flex: 1 1 5rem;
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
