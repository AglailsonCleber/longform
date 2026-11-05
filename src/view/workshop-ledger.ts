import type { App } from "obsidian";

import { workshopTick } from "src/model/workshop-store";
import {
  addAnswer,
  addInvite,
  addThread,
  dropInvite,
  earnSwapCredit,
  freezeWorkshop,
  setSuggestionStatus,
  spendSwapCredit,
  type AttentionDrop,
  type BetaQuestion,
  type Invite,
  type PassageThread,
  type SwapListing,
  type Workshop,
  type WorkshopSuggestion,
} from "src/model/workshop";

type LedgerFile = {
  workshops?: Workshop[];
  threads?: PassageThread[];
  suggestions?: WorkshopSuggestion[];
  questions?: BetaQuestion[];
  attention?: AttentionDrop[];
  swaps?: SwapListing[];
};

export class WorkshopLedger {
  workshops: Workshop[] = [];
  threads: PassageThread[] = [];
  suggestions: WorkshopSuggestion[] = [];
  questions: BetaQuestion[] = [];
  attention: AttentionDrop[] = [];
  swaps: SwapListing[] = [];
  private timer = 0;
  private loaded: Promise<void>;

  constructor(private app: App) {
    this.loaded = this.read();
  }

  addWorkshop(workshop: Workshop): void {
    this.workshops = [workshop].concat(this.workshops);
    this.changed();
  }

  updateWorkshop(workshop: Workshop): void {
    this.workshops = this.workshops.map((item) =>
      item.id === workshop.id ? workshop : item
    );
    this.changed();
  }

  freeze(id: string, frozenPath: string, words: number): void {
    this.workshops = this.workshops.map((workshop) =>
      workshop.id === id
        ? freezeWorkshop(workshop, frozenPath, Date.now(), words)
        : workshop
    );
    this.changed();
  }

  closeWorkshop(id: string): void {
    this.workshops = this.workshops.map((workshop) =>
      workshop.id === id ? { ...workshop, status: "closed" } : workshop
    );
    this.changed();
  }

  invite(workshopId: string, invite: Invite): void {
    this.workshops = this.workshops.map((workshop) =>
      workshop.id === workshopId ? addInvite(workshop, invite) : workshop
    );
    this.changed();
  }

  removeInvite(workshopId: string, inviteId: string): void {
    this.workshops = this.workshops.map((workshop) =>
      workshop.id === workshopId ? dropInvite(workshop, inviteId) : workshop
    );
    this.changed();
  }

  addComment(thread: PassageThread): void {
    this.threads = addThread(this.threads, thread);
    this.changed();
  }

  addSuggestion(suggestion: WorkshopSuggestion): void {
    this.suggestions = this.suggestions.concat(suggestion).slice(-120);
    this.changed();
  }

  decideSuggestion(id: string, status: WorkshopSuggestion["status"]): void {
    this.suggestions = setSuggestionStatus(this.suggestions, id, status);
    this.changed();
  }

  addQuestion(question: BetaQuestion): void {
    this.questions = this.questions.concat(question);
    this.changed();
  }

  answerQuestion(
    questionId: string,
    answer: BetaQuestion["answers"][0]
  ): void {
    this.questions = addAnswer(this.questions, questionId, answer);
    this.changed();
  }

  addAttention(drop: AttentionDrop): void {
    if (!drop.consented) {
      return;
    }
    this.attention = this.attention.concat(drop);
    this.changed();
  }

  upsertSwap(listing: SwapListing): void {
    const without = this.swaps.filter((item) => item.id !== listing.id);
    this.swaps = without.concat(listing);
    this.changed();
  }

  earnCredit(id: string): void {
    this.swaps = earnSwapCredit(this.swaps, id);
    this.changed();
  }

  seekSwap(id: string): boolean {
    const next = spendSwapCredit(this.swaps, id);
    if (!next) {
      return false;
    }
    this.swaps = next;
    this.changed();
    return true;
  }

  dropProject(title: string): string[] {
    const gone = this.workshops.filter((workshop) => workshop.project === title);
    const ids = new Set(gone.map((workshop) => workshop.id));
    const frozen = gone
      .filter((workshop) => workshop.frozenPath.length > 0)
      .map((workshop) => workshop.frozenPath);
    this.workshops = this.workshops.filter((workshop) => workshop.project !== title);
    this.threads = this.threads.filter((thread) => !ids.has(thread.workshopId));
    this.suggestions = this.suggestions.filter((item) => !ids.has(item.workshopId));
    this.questions = this.questions.filter((item) => !ids.has(item.workshopId));
    this.attention = this.attention.filter((item) => !ids.has(item.workshopId));
    this.swaps = this.swaps.filter((item) => item.project !== title);
    this.changed();
    return frozen;
  }

  rename(from: string, to: string): void {
    this.workshops = this.workshops.map((workshop) =>
      workshop.piecePath === from ? { ...workshop, piecePath: to } : workshop
    );
    this.swaps = this.swaps.map((listing) =>
      listing.piecePath === from ? { ...listing, piecePath: to } : listing
    );
    this.changed();
  }

  flush(): void {
    window.clearTimeout(this.timer);
    void this.write();
  }

  private changed(): void {
    workshopTick.update((tick) => tick + 1);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      void this.write();
    }, 1500);
  }

  private filePath(): string {
    return `${this.app.vault.configDir}/plugins/longform/workshop.json`;
  }

  private async read(): Promise<void> {
    try {
      const raw = await this.app.vault.adapter.read(this.filePath());
      const parsed = JSON.parse(raw) as LedgerFile;
      this.workshops = Array.isArray(parsed.workshops) ? parsed.workshops : [];
      this.threads = Array.isArray(parsed.threads) ? parsed.threads : [];
      this.suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      this.questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      this.attention = Array.isArray(parsed.attention) ? parsed.attention : [];
      this.swaps = Array.isArray(parsed.swaps) ? parsed.swaps : [];
    } catch {
      this.workshops = [];
      this.threads = [];
      this.suggestions = [];
      this.questions = [];
      this.attention = [];
      this.swaps = [];
    }
    workshopTick.update((tick) => tick + 1);
  }

  private async write(): Promise<void> {
    await this.loaded;
    try {
      await this.app.vault.adapter.write(
        this.filePath(),
        JSON.stringify({
          workshops: this.workshops,
          threads: this.threads,
          suggestions: this.suggestions,
          questions: this.questions,
          attention: this.attention,
          swaps: this.swaps,
        })
      );
    } catch {
      // A failed workshop write must not interrupt the manuscript.
    }
  }
}

let bound: WorkshopLedger | null = null;

export function bindWorkshopLedger(ledger: WorkshopLedger): void {
  bound = ledger;
}

export function workshopLedger(): WorkshopLedger | null {
  return bound;
}
