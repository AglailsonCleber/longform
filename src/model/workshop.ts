export const WORKSHOP_ROLES = ["coauthor", "editor", "beta", "sensitivity"] as const;

export type WorkshopRole = (typeof WORKSHOP_ROLES)[number];

export type RolePowers = {
  canEdit: boolean;
  canSuggest: boolean;
  canComment: boolean;
  canAnswer: boolean;
  canMarkAttention: boolean;
};

export type Invite = {
  id: string;
  name: string;
  role: WorkshopRole;
};

export type WorkshopPhase = "critique" | "questions" | "closed";

export type Workshop = {
  id: string;
  project: string;
  piecePath: string;
  pieceTitle: string;
  title: string;
  frozenPath: string;
  frozenAt: number;
  invites: Invite[];
  critiqueUntil: string;
  questionsUntil: string;
  hideCritiques: boolean;
  genre: string;
  words: number;
  status: "open" | "closed";
};

export type PassageThread = {
  id: string;
  workshopId: string;
  readerId: string;
  readerName: string;
  passage: string;
  text: string;
  at: number;
  parentId: string;
  /** True when this is the reader's formal critique delivery. */
  critique: boolean;
};

export type WorkshopSuggestion = {
  id: string;
  workshopId: string;
  readerId: string;
  readerName: string;
  original: string;
  replacement: string;
  status: "pending" | "accepted" | "refused";
  at: number;
};

export type BetaQuestion = {
  id: string;
  workshopId: string;
  prompt: string;
  answers: { readerId: string; readerName: string; text: string; at: number }[];
};

export type AttentionDrop = {
  id: string;
  workshopId: string;
  readerId: string;
  readerName: string;
  passage: string;
  consented: boolean;
  at: number;
};

export type SwapListing = {
  id: string;
  project: string;
  piecePath: string;
  pieceTitle: string;
  genre: string;
  words: number;
  seeking: boolean;
  /** How many other pieces this author has already read for the queue. */
  credit: number;
};

export function newWorkshopId(at = Date.now()): string {
  return `workshop-${at}`;
}

export function newInviteId(at = Date.now()): string {
  return `invite-${at}`;
}

export function rolePowers(role: WorkshopRole): RolePowers {
  switch (role) {
    case "coauthor":
      return {
        canEdit: true,
        canSuggest: true,
        canComment: true,
        canAnswer: true,
        canMarkAttention: true,
      };
    case "editor":
      return {
        canEdit: false,
        canSuggest: true,
        canComment: true,
        canAnswer: true,
        canMarkAttention: true,
      };
    case "beta":
      return {
        canEdit: false,
        canSuggest: false,
        canComment: true,
        canAnswer: true,
        canMarkAttention: true,
      };
    case "sensitivity":
      return {
        canEdit: false,
        canSuggest: true,
        canComment: true,
        canAnswer: true,
        canMarkAttention: false,
      };
  }
}

export function phaseOf(workshop: Workshop, today: string): WorkshopPhase {
  if (workshop.status === "closed") {
    return "closed";
  }
  const critique = workshop.critiqueUntil.trim();
  const questions = workshop.questionsUntil.trim();
  if (critique.length > 0 && today <= critique) {
    return "critique";
  }
  if (questions.length > 0 && today <= questions) {
    return "questions";
  }
  if (critique.length === 0 && questions.length === 0) {
    return "critique";
  }
  return "closed";
}

export function countWords(text: string): number {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const words: string[] = [];
  for (const part of body.split(/\s+/)) {
    if (part.length > 0) {
      words.push(part);
    }
  }
  return words.length;
}

export function addInvite(workshop: Workshop, invite: Invite): Workshop {
  return {
    ...workshop,
    invites: workshop.invites.concat(invite),
  };
}

export function dropInvite(workshop: Workshop, inviteId: string): Workshop {
  return {
    ...workshop,
    invites: workshop.invites.filter((invite) => invite.id !== inviteId),
  };
}

export function inviteById(workshop: Workshop, inviteId: string): Invite | null {
  for (const invite of workshop.invites) {
    if (invite.id === inviteId) {
      return invite;
    }
  }
  return null;
}

/** A reader who has not delivered a critique yet cannot see others' critiques when hiding is on. */
export function visibleThreads(
  workshop: Workshop,
  threads: PassageThread[],
  viewerId: string,
  today: string
): PassageThread[] {
  const mine = threads.filter((thread) => thread.workshopId === workshop.id);
  if (!workshop.hideCritiques) {
    return mine;
  }
  const phase = phaseOf(workshop, today);
  if (phase === "questions" || phase === "closed") {
    return mine;
  }
  const delivered = mine.some(
    (thread) => thread.readerId === viewerId && thread.critique && thread.parentId.length === 0
  );
  if (viewerId === "author" || delivered) {
    return mine;
  }
  return mine.filter(
    (thread) => thread.readerId === viewerId || !thread.critique
  );
}

export function addThread(
  threads: PassageThread[],
  next: PassageThread
): PassageThread[] {
  return threads.concat(next);
}

export function repliesTo(threads: PassageThread[], parentId: string): PassageThread[] {
  const found: PassageThread[] = [];
  for (const thread of threads) {
    if (thread.parentId === parentId) {
      found.push(thread);
    }
  }
  found.sort((left, right) => left.at - right.at);
  return found;
}

export function applySuggestion(text: string, suggestion: WorkshopSuggestion): string | null {
  if (suggestion.original.length === 0) {
    return null;
  }
  const at = text.indexOf(suggestion.original);
  if (at < 0) {
    return null;
  }
  return (
    text.slice(0, at) + suggestion.replacement + text.slice(at + suggestion.original.length)
  );
}

export function setSuggestionStatus(
  suggestions: WorkshopSuggestion[],
  id: string,
  status: WorkshopSuggestion["status"]
): WorkshopSuggestion[] {
  return suggestions.map((suggestion) =>
    suggestion.id === id ? { ...suggestion, status } : suggestion
  );
}

export function addAnswer(
  questions: BetaQuestion[],
  questionId: string,
  answer: BetaQuestion["answers"][0]
): BetaQuestion[] {
  return questions.map((question) => {
    if (question.id !== questionId) {
      return question;
    }
    const without = question.answers.filter((item) => item.readerId !== answer.readerId);
    return { ...question, answers: without.concat(answer) };
  });
}

export function attentionForWorkshop(
  drops: AttentionDrop[],
  workshopId: string
): AttentionDrop[] {
  const found: AttentionDrop[] = [];
  for (const drop of drops) {
    if (drop.workshopId === workshopId && drop.consented) {
      found.push(drop);
    }
  }
  return found;
}

export function filterSwapQueue(
  listings: SwapListing[],
  genre: string,
  minWords: number,
  maxWords: number
): SwapListing[] {
  const needle = genre.trim().toLocaleLowerCase("pt-BR");
  const found: SwapListing[] = [];
  for (const listing of listings) {
    if (!listing.seeking) {
      continue;
    }
    if (needle.length > 0 && listing.genre.toLocaleLowerCase("pt-BR") !== needle) {
      continue;
    }
    if (listing.words < minWords || listing.words > maxWords) {
      continue;
    }
    found.push(listing);
  }
  found.sort((left, right) => left.words - right.words);
  return found;
}

/** Reading someone else's piece earns a credit; posting to the queue spends one. */
export function canEnterSwapQueue(listing: SwapListing): boolean {
  return listing.credit > 0;
}

export function earnSwapCredit(listings: SwapListing[], id: string): SwapListing[] {
  return listings.map((listing) =>
    listing.id === id ? { ...listing, credit: listing.credit + 1 } : listing
  );
}

export function spendSwapCredit(listings: SwapListing[], id: string): SwapListing[] | null {
  const current = listings.find((listing) => listing.id === id);
  if (!current || current.credit <= 0) {
    return null;
  }
  return listings.map((listing) =>
    listing.id === id
      ? { ...listing, seeking: true, credit: listing.credit - 1 }
      : listing
  );
}

export function freezeWorkshop(
  workshop: Workshop,
  frozenPath: string,
  at: number,
  words: number
): Workshop {
  return {
    ...workshop,
    frozenPath,
    frozenAt: at,
    words,
  };
}

export function todayStamp(date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

export function workshopsForProject(workshops: Workshop[], project: string): Workshop[] {
  const found: Workshop[] = [];
  for (const workshop of workshops) {
    if (workshop.project === project) {
      found.push(workshop);
    }
  }
  found.sort((left, right) => right.frozenAt - left.frozenAt);
  return found;
}

export function renameWorkshopPath<T extends { piecePath?: string }>(
  items: T[],
  from: string,
  to: string
): T[] {
  return items.map((item) =>
    item.piecePath === from ? { ...item, piecePath: to } : item
  );
}
