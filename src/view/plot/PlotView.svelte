<script lang="ts">
  import { TFile } from "obsidian";

  import {
    createAlternateEnding,
    loadPlotScenes,
    savePlot,
    saveScaffold,
  } from "src/commands/plot";
  import { structureRevision } from "src/model/architecture-store";
  import {
    arcsByPerson,
    beatsWithoutScenes,
    crowdedTitles,
    endingGroups,
    knowledge,
    parseArcs,
    parseLearns,
    parseList,
    parsePlants,
    parseTurns,
    plantReport,
    scaffoldBeats,
    scaffoldFromFrontmatter,
    scenesForNarrator,
    secretLeaks,
    storyOrder,
    threadRows,
    truthHoles,
    withoutPurpose,
    worldOrder,
    type Distance,
    type EndingKind,
    type PlotScene,
    type ScaffoldKind,
  } from "src/model/plot";
  import { selectedDraft } from "src/model/stores";
  import { useApp } from "src/view/utils";

  const app = useApp();

  const scaffoldKinds: ScaffoldKind[] = ["none", "acts", "journey", "beats"];
  const distances: Distance[] = ["close", "report", "camera"];
  const scaffoldLabel: Record<ScaffoldKind, string> = {
    none: "No scaffold",
    acts: "Three acts",
    journey: "Journey",
    beats: "Beats",
  };
  const distanceLabel: Record<Distance, string> = {
    close: "Close",
    report: "Report",
    camera: "Camera",
  };

  let scenes: PlotScene[] = [];
  let scaffoldKind: ScaffoldKind = "none";
  let povFilter = "";
  let distanceFilter: Distance | "" = "";
  let selected = "";
  let pov = "";
  let distance: Distance | "" = "";
  let story = "";
  let when = "";
  let threads = "";
  let arcs = "";
  let beat = "";
  let plants = "";
  let learns = "";
  let turns = "";
  let purpose = "";
  let change = "";
  let tension = "";
  let ending: EndingKind | "" = "";

  async function reload(): Promise<void> {
    const revision = $structureRevision;
    const draft = $selectedDraft;
    void revision;
    scenes = await loadPlotScenes(app);
    if (!draft) {
      scaffoldKind = "none";
      return;
    }
    const file = app.vault.getAbstractFileByPath(draft.vaultPath);
    scaffoldKind =
      file instanceof TFile
        ? scaffoldFromFrontmatter(app.metadataCache.getFileCache(file)?.frontmatter).kind
        : "none";
  }

  $: void reload();

  $: shown = scenesForNarrator(scenes, povFilter, distanceFilter);
  $: rows = threadRows(scenes);
  $: crowded = crowdedTitles(scenes);
  $: chapters = scenes.filter((scene) => scene.role !== "cut" && scene.role !== "variant" && scene.role !== "appendix");
  $: storyLine = storyOrder(scenes);
  $: worldLine = worldOrder(scenes);
  $: arcLines = arcsByPerson(scenes);
  $: missingBeats = beatsWithoutScenes(
    { kind: scaffoldKind, names: scaffoldBeats(scaffoldKind) },
    scenes
  );
  $: plantsReport = plantReport(scenes);
  $: known = knowledge(scenes);
  $: leaks = secretLeaks(scenes);
  $: holes = truthHoles(scenes);
  $: idle = withoutPurpose(scenes);
  $: endings = endingGroups(scenes);
  $: narrators = uniquePov(scenes);

  function uniquePov(list: PlotScene[]): string[] {
    const names: string[] = [];
    for (const scene of list) {
      if (scene.pov && names.indexOf(scene.pov) < 0) {
        names.push(scene.pov);
      }
    }
    return names;
  }

  function titles(list: PlotScene[]): string {
    const names: string[] = [];
    for (const scene of list) {
      names.push(scene.title);
    }
    return names.join(" · ");
  }

  function choose(scene: PlotScene): void {
    selected = scene.path;
    pov = scene.pov;
    distance = scene.distance;
    story = scene.story;
    when = scene.when;
    threads = scene.threads.join(", ");
    const arcLines: string[] = [];
    for (const arc of scene.arcs) {
      arcLines.push(`${arc.who}: ${arc.change}`);
    }
    arcs = arcLines.join("\n");
    beat = scene.beat;
    const plantLines: string[] = [];
    for (const plant of scene.plants) {
      plantLines.push(`${plant.name} | ${plant.kind}`);
    }
    plants = plantLines.join("\n");
    const learnLines: string[] = [];
    for (const learn of scene.learns) {
      learnLines.push(`${learn.who}: ${learn.fact}`);
    }
    learns = learnLines.join("\n");
    const turnLines: string[] = [];
    for (const turn of scene.turns) {
      turnLines.push(`${turn.thing} | ${turn.becomes}`);
    }
    turns = turnLines.join("\n");
    purpose = scene.purpose;
    change = scene.change;
    tension = scene.tension;
    ending = scene.ending;
    const file = app.vault.getAbstractFileByPath(scene.path);
    if (file instanceof TFile) {
      void app.workspace.getLeaf(false).openFile(file);
    }
  }

  async function keep(scene: PlotScene): Promise<void> {
    await savePlot(app, {
      ...scene,
      pov,
      distance,
      story,
      when,
      threads: parseList(threads),
      arcs: parseArcs(arcs),
      beat,
      plants: parsePlants(plants),
      learns: parseLearns(learns),
      turns: parseTurns(turns),
      purpose,
      change,
      tension,
      ending,
    });
  }

  function people(): string[] {
    const names: string[] = [];
    for (const line of arcLines) {
      if (names.indexOf(line.who) < 0) {
        names.push(line.who);
      }
    }
    return names;
  }
</script>

<div class="longform-plot">
  <h3>Plot</h3>
  <p class="longform-plot-muted">
    Chapter order is the book. Story time and world time can run another way. A scene can stay unmarked.
  </p>
  <div class="longform-plot-actions">
    <button type="button" class:selected={povFilter === ""} on:click={() => (povFilter = "")}
      >Any narrator</button
    >
    {#each narrators as name (name)}
      <button type="button" class:selected={povFilter === name} on:click={() => (povFilter = name)}
        >{name}</button
      >
    {/each}
    <button type="button" class:selected={distanceFilter === ""} on:click={() => (distanceFilter = "")}
      >Any distance</button
    >
    {#each distances as item (item)}
      <button
        type="button"
        class:selected={distanceFilter === item}
        on:click={() => (distanceFilter = item)}>{distanceLabel[item]}</button
      >
    {/each}
  </div>

  <h4>Scenes</h4>
  {#each shown as scene (scene.path)}
    <article>
      <button type="button" class="longform-plot-open" on:click={() => choose(scene)}
        >{scene.title}</button
      >
      <p class="longform-plot-muted">
        {scene.purpose || "No purpose yet"}
        {#if scene.pov}· {scene.pov}{/if}
        {#if scene.distance}· {distanceLabel[scene.distance]}{/if}
        {#if scene.story}· story {scene.story}{/if}
        {#if scene.when}· world {scene.when}{/if}
      </p>
      {#if selected === scene.path}
        <div class="longform-plot-fields">
          <input type="text" placeholder="Narrator" bind:value={pov} />
          <select bind:value={distance}>
            <option value="">Distance</option>
            {#each distances as item (item)}
              <option value={item}>{distanceLabel[item]}</option>
            {/each}
          </select>
          <input type="text" placeholder="Story time" bind:value={story} />
          <input type="text" placeholder="World time" bind:value={when} />
          <input type="text" placeholder="Threads, separated by commas" bind:value={threads} />
          <input type="text" placeholder="Beat" bind:value={beat} />
          <input type="text" placeholder="Why this scene exists" bind:value={purpose} />
          <input type="text" placeholder="What changes" bind:value={change} />
          <input type="text" placeholder="Tension" bind:value={tension} />
          <select bind:value={ending}>
            <option value="">Ending</option>
            <option value="trunk">Trunk</option>
            <option value="alternate">Alternate</option>
          </select>
        </div>
        <label>Arcs, one per line, as Name: what changes<textarea bind:value={arcs}></textarea></label>
        <label>Plants, as name | plant or name | payoff<textarea bind:value={plants}></textarea></label>
        <label>Who learns a fact, as Name: fact<textarea bind:value={learns}></textarea></label>
        <label>What stops being true, as thing | gone or thing | kept<textarea bind:value={turns}></textarea></label>
        <button type="button" on:click={() => void keep(scene)}>Keep</button>
      {/if}
    </article>
  {/each}

  <h4>Threads</h4>
  {#each rows as row (row.name)}
    <p>{row.name}: {row.present.join(" · ")}</p>
    {#if row.gaps.length > 0}
      <p class="longform-plot-muted">Gap in {row.name}: {row.gaps.join(" · ")}</p>
    {/if}
  {/each}
  {#if crowded.length > 0}
    <p class="longform-plot-muted">Crowded: {crowded.join(" · ")}</p>
  {/if}

  <h4>Time</h4>
  <p>Chapters: {titles(chapters)}</p>
  <p>Story: {titles(storyLine)}</p>
  <p>World: {titles(worldLine)}</p>

  <h4>Arcs</h4>
  {#each people() as who (who)}
    <p>{who}</p>
    {#each arcLines.filter((line) => line.who === who) as line (`${line.scene}-${line.change}`)}
      <p class="longform-plot-muted">{line.scene}: {line.change}</p>
    {/each}
  {/each}

  <h4>Scaffold</h4>
  <div class="longform-plot-actions">
    {#each scaffoldKinds as kind (kind)}
      <button
        type="button"
        class:selected={scaffoldKind === kind}
        on:click={() => {
          if ($selectedDraft) {
            void saveScaffold(app, $selectedDraft.vaultPath, kind);
          }
        }}>{scaffoldLabel[kind]}</button
      >
    {/each}
  </div>
  {#if missingBeats.length > 0}
    <p class="longform-plot-muted">Open beats: {missingBeats.join(" · ")}</p>
  {/if}

  <h4>Plants</h4>
  {#each plantsReport.unpaid as item (`${item.id}-unpaid`)}
    <p class="longform-plot-muted">{item.name} is planted in {item.scene} and has no payoff.</p>
  {/each}
  {#each plantsReport.ungrounded as item (`${item.id}-${item.scene}`)}
    <p class="longform-plot-muted">{item.name} pays off in {item.scene} with no earlier plant.</p>
  {/each}

  <h4>Who knows what</h4>
  {#each known as item (`${item.who}-${item.fact}`)}
    <p class="longform-plot-muted">{item.who} knows {item.fact} from {item.since}.</p>
  {/each}
  {#each leaks as leak (`${leak.scene}-${leak.fact}`)}
    <p>{leak.who} meets {leak.fact} in {leak.scene} before learning it.</p>
  {/each}

  <h4>What stopped being true</h4>
  {#each holes as hole (`${hole.thing}-${hole.usedIn}`)}
    <p>{hole.thing} is gone after {hole.lostIn} and appears in {hole.usedIn}.</p>
  {/each}

  <h4>Purpose</h4>
  {#if idle.length > 0}
    <p class="longform-plot-muted">No purpose yet: {idle.join(" · ")}</p>
  {/if}

  <h4>Endings</h4>
  <p>Trunk: {titles(endings.trunk) || "None marked"}</p>
  <p>Alternates: {titles(endings.alternates) || "None"}</p>
  <button type="button" on:click={() => void createAlternateEnding(app)}>New alternate ending</button>
</div>

<style>
  .longform-plot {
    font-size: var(--longform-explorer-font-size);
  }

  h3,
  h4,
  p,
  label {
    margin: 0.35rem 0;
  }

  article {
    margin: 0.55rem 0;
    min-width: 0;
  }

  .longform-plot-muted {
    color: var(--text-muted);
  }

  .longform-plot-actions,
  .longform-plot-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 100%;
    min-width: 0;
    margin: 0.35rem 0;
  }

  button,
  input,
  select,
  textarea {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
  }

  button {
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
  }

  button.selected {
    color: var(--text-accent);
  }

  textarea,
  input,
  select {
    width: 100%;
  }

  textarea {
    display: block;
    min-height: 3.2rem;
  }

  .longform-plot-open {
    font-weight: var(--font-semibold);
  }
</style>
