## Longform

Longform is a plugin for [Obsidian](https://obsidian.md) for a novel, a poem, a story, a chronicle, or a script. The manuscript stays Markdown. It lets you organize a series of notes, or _scenes_, into an ordered manuscript, and it also supports a single note for a shorter work.

> [!TIP]
> If you’d like a way to sync, share your manuscripts with others, and edit them on the web check out my other project, [screen.garden](https://screen.garden).

Major features include:

- A project kind chosen at creation. The pane then shows the tabs for that kind. A project with no kind keeps every tab;
- A dedicated sidebar that collects your projects from across your vault;
- A [reorderable, nestable list](./docs/MULTIPLE_SCENE_PROJECTS.md) of scenes;
- Scene, draft, and project [word counts](./docs/WORD_COUNTS.md#word-counts-for-projects-drafts-and-scenes), plus a session goal in words, minutes, lines, or stanzas;
- An **Output** tab for the manuscript you send or give to a reader, and the [Compile](./docs/COMPILE.md) step workflow;
- [Single-scene projects](./docs/SINGLE_SCENE_PROJECTS.md) for one poem, one story, or one column;
- A writing page: hidden properties, a current-line highlight, focus, typewriter mode, a chosen page language, and private margin comments whose `%%? … %%` stays hidden until the cursor is on it.

The full usage guide, in Portuguese, is the [manual](./docs/MANUAL.md). The command list is [COMMANDS.md](./docs/COMMANDS.md). A short Getting Started follows.

## Installing

Longform is in the Community Plugins section of Obsidian’s settings. You may also install it manually by copying the `main.js`, `manifest.json`, and `styles.css` files from a release into a `longform/` folder in the `.obsidian/plugins` folder of your vault. The Community Plugins interface is preferred.

## Getting Started

Longform works by searching your vault for any note that contains a frontmatter entry named `longform` (don’t worry if you don’t know what that means; Longform includes tools to help you generate these files). You can think of these notes as the “spines” or tables of contents of your projects. Let‘s walk through creating two different Longform projects: a novel and a short story.

### Creating a Novel

1. To begin, find or create a folder somewhere in your vault in which you’d like to create your novel. Right-click it and select `Create Longform Project`.

![Create Longform Project menu item](./docs/res/walkthrough-create-longform-project.png)

2. A `Create Project` modal will appear. Choose a kind first: **Novel**, **Poetry**, **Story**, **Chronicle**, or **Script**. Then choose **Multi** or **Single**. A novel suggests **Multi**. The text under the project type switch explains how each type of project works.

3. In the `Title` field, enter your novel’s title. For this example we’ll use `My Great Novel`. The modal tells us the type of project we’re creating and the location of the _Index File_ it will create in our vault. We’ll get into what Index Files are in a moment.

![A filled-out create multi-scene project modal](./docs/res/walkthrough-create-multi.png)

> **Note**
>
> You don’t have to use this menu item and modal to create Longform projects. As you will see shortly, Longform projects are one or more notes organized around some YAML frontmatter. You can always create a note yourself somewhere in your vault and use the `Insert Multi-Scene Frontmatter` and `Insert Single-Scene Frontmatter` commands to populate the note—Longform will recognize it automatically. Although not recommended, you can also author the YAML frontmatter manually, too.

4. Click `Create`. Longform has created the promised file. Open the Longform pane with **Open Longform pane**. The project is already selected. A multi-scene novel shows **Scenes**, plus **Structure**, **Plot**, **Bible**, **Story**, and the tabs every project has: **Project**, **Capture**, **Revision**, **Habit**, **Workshop**, **Output**, **Life**, **Archive**, and **Compile**. **Scenes** is selected. The picture below is from an earlier pane, so it shows only **Scenes**, **Project**, and **Compile**.

![The newly-created project in the Longform pane](./docs/res/walkthrough-multi-fresh-pane.png)

5. That _New Scene_ placeholder is a text field—click it and enter something that sounds like the first scene of a novel, maybe “The Sun Rises on Dublin,” and press enter. You should now be editing a so-named note, and your scene should appear in the Scenes tab:

![the "My Great Novel" novel with a freshly-created scene](./docs/res/multi-walkthrough-2.png)

6. Your editor also now has the scene open and ready to write. If you click the small `My Great Novel/Index.md` link under your project name, you’ll be taken back to the index file where you’ll see your new scene listed under the `scenes` frontmatter entry:

```yaml
scenes:
  - The Sun Rises on Dublin
```

This is how Longform tracks your work.

> **Warning**
>
> You should probably avoid editing the `longform` frontmatter in your index file directly unless you really know what you’re doing. Longform supports direct editing of it and will do its best to sync, but it’s easy to accidentally mess things up. You can always revert your changes, though: Longform will never delete files based on changes in the index file.

7. You’re now ready to write your novel. Keep adding scenes as needed. Drag a scene left or right, or use **Indent scene** and **Unindent scene**, to nest a part, a chapter, and a scene. [Multiple-scene projects](./docs/MULTIPLE_SCENE_PROJECTS.md) describes that list.

8. When you’re ready for a manuscript, use **Output** to export it, or [Compile](./docs/COMPILE.md) to run a step workflow.

### Creating a Short Story

Longform also supports [single-scene projects](./docs/SINGLE_SCENE_PROJECTS.md) that live as a single note in your vault. Let’s create one.

1. Right-click the enclosing folder as before and select the `Create Longform Project` menu item.

2. In the Create Project modal, choose `Single`. Let’s write something noirish and call it `On the Rooftops`.

![Creating a single-scene Longform project in the Create Project modal](./docs/res/walkthrough-create-single.png)

3. Click Create. Because this is a single-scene project, there is only one note associated with it and Longform will open it automatically. The frontmatter at the top tells Longform how to track your project; we’ll write the story in the note itself.

4. Write your story! When you’re ready, you can use the Compile tab to generate a manuscript. Single-scene projects can use scene and manuscript steps in any order.

## Drafts & Projects

Longform supports the creation of multiple _drafts_ for a given project. Under the hood, drafts are just different Longform projects with the same title—they are then grouped together by Longform and presented as different versions of the same project.

To create a new draft of a project use the new draft (+) button in the Project tab, or create an entirely new project somewhere and set the title in the Project tab to be the same as your existing project.

You can rename drafts by right-clicking them in the Project tab and selecting Rename, or by setting the `draftTitle` attribute in their `longform` frontmatter.

## Compiling

**Output** exports the manuscript. The **Compile** tab still builds a workflow of steps. See [COMPILE.md](./docs/COMPILE.md).

> [!TIP]
> You can find more compile steps for various use cases in the [community collection of compile steps](https://github.com/obsidian-community/longform-compile-steps).

## Scene-only Styling

Longform will automatically attach a `.longform-leaf` class to the container panes of any notes that are part of a Longform project. This means you can add custom CSS snippets to Obsidian that style your writing environment and _only_ your writing environment. For example, I prefer a dark theme for Obsidian but a light theme for writing, so my writing snippet looks something like this:

```css
/* Set some variables for the entire leaf. */
.longform-leaf {
  --background-primary: white;
  --background-primary-alt: white;
  --background-secondary: white;
  --background-secondary-alt: white;
}

/* Style the editor. */
.longform-leaf .markdown-source-view {
  --background-primary: white;
  --background-primary-alt: white;
  --background-secondary: white;
  --background-secondary-alt: white;
  --text-selection: #aaa;
  --text-normal: black;
  color: black;
  background-color: white;
}

/* Style text selection. */
.longform-leaf .suggestion-item.is-selected {
  background-color: var(--text-accent);
}

/* Style the header of the leaf. */
.longform-leaf .view-header {
  background-color: white;
}

/* Style the text content of the leaf header. */
.longform-leaf .view-header-title {
  --text-normal: black;
}
```

Longform’s own UI will always use existing Obsidian CSS theme variables when possible, so it should always look at home in your theme.

## Troubleshooting

First, the most important bit: **Longform is built specifically to never alter the contents on your notes.** The only note it rewrites is a project’s index file. As such, Longform can’t delete or lose your notes.

Longform does a lot of complex tracking to bridge a project’s metadata with the state of files on disk. Although it tries to cover lots of edge cases, it is possible to cause desync between what Longform thinks is happening with projects and what’s actually going on. Most often this occurs when a project’s frontmatter is malformed or invalid in some way. Because projects are inferred from frontmatter, if your frontmatter is correct you can always restart Obsidian (or choose the "reload without saving" command) to force Longform to recalculate projects.

## Sponsorship

Any [sponsorship](https://github.com/sponsors/kevboh) is deeply appreciated, although by no means necessary.

## License

See [LICENSE.md](./LICENSE.md). You can view the license’s history [here](https://git.sr.ht/~boringcactus/fafol/tree/master/LICENSE.md).
