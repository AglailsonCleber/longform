export type SuggestionKind = "suggestion" | "critique";

export function suggestionMessages(
  kind: SuggestionKind,
  passage: string
): { role: string; content: string }[] {
  return [
    {
      role: "system",
      content:
        "You are a reader of one passage. Suggest or critique only what is shown. Do not continue the story, do not write in the author's voice, and do not claim the words are yours or theirs. Reply in the language of the passage. The author decides what stays.",
    },
    {
      role: "user",
      content: `Task: ${kind}\n\nPassage:\n${passage}`,
    },
  ];
}

export function readSuggestionReply(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
  };
  const choice = record.choices && record.choices[0] && record.choices[0].message;
  if (choice && typeof choice.content === "string" && choice.content.trim().length > 0) {
    return choice.content.trim();
  }
  if (typeof record.response === "string" && record.response.trim().length > 0) {
    return record.response.trim();
  }
  return null;
}
