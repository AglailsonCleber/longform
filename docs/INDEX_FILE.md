# The Index File

The Index File is a note with a `longform` frontmatter entry. You can think of it as the “root” of a project: it tells Longform what kind of project it is, where the scenes are, and other metadata needed to make everything work.

## The `longform` Entry

The `longform` frontmatter entry is how Longform discovers, tracks, and reasons about projects. It contains the following properties:

| Name       | Type                                           | Required? | Description                                                                                                                                                                                          |
| ---------- | ---------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| format     | `"single"` or `"scenes"`                       | true      | Whether this is a [single-](./SINGLE_SCENE_PROJECTS.md) or [multi-](./MULTIPLE_SCENE_PROJECTS.md) scene project.                                                                                     |
| title      | `string`                                       | false     | The title of the project. If multiple projects have the same title, they are treated as separate drafts of the same project. If not specified, uses the name of the index file as the project title. |
| draftTitle | `string`                                       | false     | The name of this draft, shown in the Project tab. Rename there, or set this field.                                                                                                                  |
| kind       | `"novel"`, `"poetry"`, `"story"`, `"chronicle"`, or `"script"` | false | Chosen when the project is created. It decides which pane tabs and page forms appear. Absent on projects made before kinds existed; those projects keep every tab and every page form. |
| workflow   | `string`                                       | false     | The compile workflow selected for this draft. Written when a workflow is chosen. Do not edit it by hand.                                                                                            |

Drafts of one project share `title`. `draftTitle` is the name of one draft. The app does not read `draftNumber`.

In addition to the above, multi-scene projects have some additional frontmatter in the `longform` entry:

| Name          | Type                          | Required? | Description                                                                                                                                            |
| ------------- | ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sceneFolder   | `string`                      | false     | The path—relative to the index file—where your scenes live. If it is omitted, Longform uses the index file’s own folder.                               |
| scenes        | `string[]` (array of strings) | true      | Nested arrays of scene file names (without .md extensions).                                                                                            |
| sceneTemplate | `string`                      | false     | Path to file to use as a template for newly-created scenes in this project.                                                                            |
| ignoredFiles  | `string[]` (array of strings) | false     | If present, a list of scene names (without .md extensions, wildcards are allowed) to ignore when prompting to add newly-created files to your project. |

## Other Frontmatter

You’re free to put any other frontmatter you’d like in the index file as long as that frontmatter is outside the `longform` entry. Longform will leave it alone. You might want to do this to integrate with other Obsidian plugins.
