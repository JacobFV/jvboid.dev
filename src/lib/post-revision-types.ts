export type PostRevision = {
  slug: string;
  postId: string;
  sequence: number;
  commit: string;
  shortCommit: string;
  authoredAt: string;
  committedAt: string;
  authorName: string;
  authorEmail: string;
  committerName: string;
  committerEmail: string;
  subject: string;
  sourcePath: string;
  repositoryUrl: string;
  sourceBase64: string;
  title: string;
  publishedDate: string;
  summary: string;
  legacy: boolean;
  body: string;
};

export type PostRevisionSummary = {
  count: number;
  updatedDate?: string;
  latestCommit?: string;
};
