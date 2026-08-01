import rawPostRevisions from "../../.velite/postRevisions.json";
import type { PostRevision, PostRevisionSummary } from "./post-revision-types";

const revisions = (rawPostRevisions as PostRevision[]).toSorted((left, right) => {
  if (left.postId !== right.postId) return left.postId.localeCompare(right.postId);
  return left.sequence - right.sequence;
});

const byPost = new Map<string, PostRevision[]>();
for (const revision of revisions) {
  const postRevisions = byPost.get(revision.postId) ?? [];
  postRevisions.push(revision);
  byPost.set(revision.postId, postRevisions);
}

export function getPostRevisions(postId: string): PostRevision[] {
  return byPost.get(postId) ?? [];
}

export function getPostRevisionSummary(postId: string): PostRevisionSummary {
  const postRevisions = getPostRevisions(postId);
  const latest = postRevisions.at(-1);
  return {
    count: postRevisions.length,
    updatedDate: postRevisions.length > 1 ? latest?.committedAt.slice(0, 10) : undefined,
    latestCommit: latest?.commit,
  };
}
