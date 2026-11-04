import { ConcatenateTextStep } from "./concatenate-text";
import { PrependTitleStep } from "./prepend-title";
import { RemoveCommentsStep } from "./remove-comments";
import { RemoveLinksStep } from "./remove-links";
import { RemoveStrikethroughsStep } from "./remove-strikethroughs";
import { StripFrontmatterStep } from "./strip-frontmatter";
import { WriteToNoteStep } from "./write-to-note";
import { AddFrontmatterStep } from "./add-frontmatter";
import { JoinScenesStep } from "./join-scenes";
import { AddBookOpeningStep } from "./add-book-opening";
import { ExportFileStep } from "./export-file";

export const BUILTIN_STEPS = [
  AddFrontmatterStep,
  AddBookOpeningStep,
  ConcatenateTextStep,
  ExportFileStep,
  JoinScenesStep,
  PrependTitleStep,
  RemoveCommentsStep,
  RemoveLinksStep,
  RemoveStrikethroughsStep,
  StripFrontmatterStep,
  WriteToNoteStep,
];
