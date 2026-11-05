import type { App } from "obsidian";

import { literaryTick } from "src/model/literary-store";
import {
  EMPTY_CONTEST,
  EMPTY_RIGHTS,
  freezeSubmission,
  prepareSubmission,
  setPublishedUrl,
  setSubmissionContest,
  setSubmissionRights,
  setSubmissionStatus,
  type ContestInfo,
  type Contract,
  type Edition,
  type Rights,
  type Submission,
  type SubmissionStatus,
  type Venue,
} from "src/model/literary";

type LedgerFile = {
  venues?: Venue[];
  submissions?: Submission[];
  contracts?: Contract[];
  editions?: Edition[];
};

export class LiteraryLedger {
  venues: Venue[] = [];
  submissions: Submission[] = [];
  contracts: Contract[] = [];
  editions: Edition[] = [];
  private timer = 0;
  private loaded: Promise<void>;

  constructor(private app: App) {
    this.loaded = this.read();
  }

  addVenue(venue: Venue): void {
    this.venues = this.venues.concat(venue);
    this.changed();
  }

  updateVenue(venue: Venue): void {
    this.venues = this.venues.map((item) => (item.id === venue.id ? venue : item));
    this.changed();
  }

  dropVenue(id: string): void {
    this.venues = this.venues.filter((venue) => venue.id !== id);
    this.changed();
  }

  addSubmission(
    next: Omit<Submission, "status" | "sentAt" | "decidedAt" | "frozenPath" | "publishedUrl"> & {
      frozenPath?: string;
      publishedUrl?: string;
    }
  ): void {
    this.submissions = prepareSubmission(this.submissions, next);
    this.changed();
  }

  setStatus(id: string, status: SubmissionStatus): void {
    this.submissions = setSubmissionStatus(this.submissions, id, status);
    this.changed();
  }

  freeze(id: string, frozenPath: string): void {
    this.submissions = freezeSubmission(this.submissions, id, frozenPath);
    this.changed();
  }

  setUrl(id: string, url: string): void {
    this.submissions = setPublishedUrl(this.submissions, id, url);
    this.changed();
  }

  setRights(id: string, rights: Rights): void {
    this.submissions = setSubmissionRights(this.submissions, id, rights);
    this.changed();
  }

  setContest(id: string, contest: ContestInfo): void {
    this.submissions = setSubmissionContest(this.submissions, id, contest);
    this.changed();
  }

  dropProject(title: string): string[] {
    const frozen = this.submissions
      .filter((submission) => submission.project === title && submission.frozenPath)
      .map((submission) => submission.frozenPath);
    this.submissions = this.submissions.filter((submission) => submission.project !== title);
    this.contracts = this.contracts.filter((contract) => contract.project !== title);
    this.editions = this.editions.filter((edition) => edition.project !== title);
    this.changed();
    return frozen;
  }

  dropSubmission(id: string): void {
    this.submissions = this.submissions.filter((submission) => submission.id !== id);
    this.changed();
  }

  addContract(contract: Contract): void {
    this.contracts = [contract].concat(this.contracts).slice(0, 80);
    this.changed();
  }

  dropContract(id: string): void {
    this.contracts = this.contracts.filter((contract) => contract.id !== id);
    this.changed();
  }

  addEdition(edition: Edition): void {
    this.editions = [edition].concat(this.editions).slice(0, 40);
    this.changed();
  }

  rename(from: string, to: string): void {
    this.submissions = this.submissions.map((submission) =>
      submission.piecePath === from ? { ...submission, piecePath: to } : submission
    );
    this.contracts = this.contracts.map((contract) =>
      contract.piecePath === from ? { ...contract, piecePath: to } : contract
    );
    this.editions = this.editions.map((edition) => ({
      ...edition,
      bodyPaths: edition.bodyPaths.map((path) => (path === from ? to : path)),
      coverPath: edition.coverPath === from ? to : edition.coverPath,
    }));
    this.changed();
  }

  flush(): void {
    window.clearTimeout(this.timer);
    void this.write();
  }

  private changed(): void {
    literaryTick.update((tick) => tick + 1);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      void this.write();
    }, 1500);
  }

  private filePath(): string {
    return `${this.app.vault.configDir}/plugins/longform/literary.json`;
  }

  private async read(): Promise<void> {
    try {
      const raw = await this.app.vault.adapter.read(this.filePath());
      const parsed = JSON.parse(raw) as LedgerFile;
      this.venues = Array.isArray(parsed.venues) ? parsed.venues : [];
      this.submissions = Array.isArray(parsed.submissions) ? parsed.submissions : [];
      this.contracts = Array.isArray(parsed.contracts) ? parsed.contracts : [];
      this.editions = Array.isArray(parsed.editions) ? parsed.editions : [];
    } catch {
      this.venues = [];
      this.submissions = [];
      this.contracts = [];
      this.editions = [];
    }
    literaryTick.update((tick) => tick + 1);
  }

  private async write(): Promise<void> {
    await this.loaded;
    try {
      await this.app.vault.adapter.write(
        this.filePath(),
        JSON.stringify({
          venues: this.venues,
          submissions: this.submissions,
          contracts: this.contracts,
          editions: this.editions,
        })
      );
    } catch {
      // A failed literary ledger write must not interrupt the manuscript.
    }
  }
}

let bound: LiteraryLedger | null = null;

export function bindLiteraryLedger(ledger: LiteraryLedger): void {
  bound = ledger;
}

export function literaryLedger(): LiteraryLedger | null {
  return bound;
}

export { EMPTY_CONTEST, EMPTY_RIGHTS };
