import rawChapters from "../../.velite/bio.json";

// The /bio chapters, compiled by velite from content/bio. See the `bio`
// collection in velite.config.ts for how a filename becomes a chapter's
// place and its URL.
export type BioChapter = {
  id: string;
  title: string;
  summary?: string;
  order: number | null;
  written: boolean;
  body: string;
};

const all = rawChapters as BioChapter[];

/** The numbered chapters, in order — what the /bio index lists. */
export function getChapters(): BioChapter[] {
  return all
    .filter((c): c is BioChapter & { order: number } => c.order !== null)
    .sort((a, b) => a.order - b.order);
}

/** Every chapter that has a page, dotfiles like `.old` included. */
export function getAllChapters(): BioChapter[] {
  return all;
}

export function getChapter(id: string): BioChapter | undefined {
  return all.find((c) => c.id === id);
}
