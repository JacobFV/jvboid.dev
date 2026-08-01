"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MDXContent } from "@/lib/mdx";
import { diffLines, type DiffLine } from "@/lib/line-diff";
import type { PostRevision } from "@/lib/post-revision-types";

type PostRevisionExperienceProps = {
  postId: string;
  postedDate: string;
  currentTitle: string;
  currentSummary: string;
  currentBody: string;
  revisions: PostRevision[];
};

const dateOnly = (iso: string) => iso.slice(0, 10);
const dateAndTime = (iso: string) => iso.replace("T", " ").slice(0, 16);

function decodeBase64(value: string): string {
  try {
    const binary = globalThis.atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function revisionFromUrl(revisions: PostRevision[], latestCommit: string | null) {
  if (typeof window === "undefined") return latestCommit;
  const requested = new URL(window.location.href).searchParams.get("revision");
  return revisions.some((revision) => revision.commit === requested) ? requested : latestCommit;
}

function highlightFromUrl() {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get("changes") === "1";
}

export function PostRevisionExperience({
  postId,
  postedDate,
  currentTitle,
  currentSummary,
  currentBody,
  revisions,
}: PostRevisionExperienceProps) {
  const latest = revisions.at(-1) ?? null;
  const latestCommit = latest?.commit ?? null;
  const [selectedCommit, setSelectedCommit] = useState(latestCommit);
  const [highlightChanges, setHighlightChanges] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      setSelectedCommit(revisionFromUrl(revisions, latestCommit));
      setHighlightChanges(highlightFromUrl());
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [latestCommit, revisions]);

  const selectedIndex = Math.max(
    0,
    revisions.findIndex((revision) => revision.commit === selectedCommit),
  );
  const selected = revisions[selectedIndex] ?? latest;
  const previous = selectedIndex > 0 ? revisions[selectedIndex - 1] : null;

  const setUrlState = (commit: string | null, changes: boolean, push: boolean) => {
    const url = new URL(window.location.href);
    if (!commit || commit === latestCommit) url.searchParams.delete("revision");
    else url.searchParams.set("revision", commit);
    if (changes) url.searchParams.set("changes", "1");
    else url.searchParams.delete("changes");
    if (push) window.history.pushState({}, "", url);
    else window.history.replaceState({}, "", url);
  };

  const selectRevision = (commit: string) => {
    setSelectedCommit(commit);
    setUrlState(commit, highlightChanges, true);
  };

  const setHighlight = (enabled: boolean) => {
    setHighlightChanges(enabled);
    setUrlState(selected?.commit ?? latestCommit, enabled, false);
  };

  const title = selected?.title ?? currentTitle;
  const summary = selected?.summary ?? currentSummary;
  const body = selected?.body ?? currentBody;

  return (
    <>
      <header
        style={{ viewTransitionName: `node-${postId}` }}
        className="mb-10 border-b border-[var(--color-bg-2)]/60 pb-8"
      >
        <div className="mb-3 flex flex-wrap items-baseline gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <span>
            posted: <time dateTime={postedDate}>{postedDate}</time>
          </span>
          {revisions.length > 1 && latest && (
            <>
              <span aria-hidden>·</span>
              <PostRevisionMenu
                revisions={revisions}
                selectedCommit={selected?.commit ?? latest.commit}
                latest={latest}
                highlightChanges={highlightChanges}
                onSelect={selectRevision}
                onHighlightChange={setHighlight}
              />
            </>
          )}
        </div>

        <h1
          data-page-title
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)] sm:text-5xl"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-dim)]">{summary}</p>
      </header>

      <div className="prose-mdx">
        {highlightChanges && selected ? (
          <PostRevisionDiff previous={previous} selected={selected} />
        ) : (
          <MDXContent code={body} />
        )}
      </div>
    </>
  );
}

type PostRevisionMenuProps = {
  revisions: PostRevision[];
  selectedCommit: string;
  latest: PostRevision;
  highlightChanges: boolean;
  onSelect: (commit: string) => void;
  onHighlightChange: (enabled: boolean) => void;
};

function PostRevisionMenu({
  revisions,
  selectedCommit,
  latest,
  highlightChanges,
  onSelect,
  onHighlightChange,
}: PostRevisionMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer bg-transparent p-0 text-inherit underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:text-[var(--color-accent)] hover:decoration-[var(--color-accent)]"
      >
        updated: <time dateTime={latest.committedAt}>{dateOnly(latest.committedAt)}</time>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Post revisions"
          className="absolute top-[calc(100%+0.5rem)] left-0 z-50 w-[26rem] max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] bg-[var(--color-bg-0)] text-left shadow-[0_18px_48px_color-mix(in_srgb,var(--color-ink)_20%,transparent)]"
        >
          <div className="max-h-[24rem] overflow-y-auto py-1">
            {[...revisions].reverse().map((revision) => {
              const selected = revision.commit === selectedCommit;
              return (
                <div
                  key={revision.commit}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch border-b border-[var(--color-bg-2)]/55 last:border-b-0 hover:bg-[var(--color-bg-1)]"
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onSelect(revision.commit);
                      setOpen(false);
                    }}
                    className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-2 px-3 py-2.5 text-left"
                  >
                    <span aria-hidden className="pt-0.5 text-[var(--color-accent)]">
                      {selected ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <time
                        dateTime={revision.committedAt}
                        className="block text-xs text-[var(--color-ink)]"
                      >
                        {dateAndTime(revision.committedAt)}
                      </time>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--color-ink-mute)]">
                        {revision.subject}
                      </span>
                    </span>
                  </button>
                  <a
                    href={`${revision.repositoryUrl}/commit/${revision.commit}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open commit ${revision.shortCommit}`}
                    className="flex items-center border-l border-[var(--color-bg-2)]/55 px-3 text-[10px] text-[var(--color-ink-mute)] no-underline hover:text-[var(--color-accent)]"
                  >
                    {revision.shortCommit} ↗
                  </a>
                </div>
              );
            })}
          </div>
          <label className="flex cursor-pointer items-center gap-2 border-t border-[var(--color-bg-2)] px-3 py-3 text-xs text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-1)]">
            <input
              type="checkbox"
              checked={highlightChanges}
              onChange={(event) => onHighlightChange(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            <span>highlight changes</span>
          </label>
        </div>
      )}
    </div>
  );
}

function PostRevisionDiff({
  previous,
  selected,
}: {
  previous: PostRevision | null;
  selected: PostRevision;
}) {
  const before = useMemo(
    () => (previous ? decodeBase64(previous.sourceBase64) : ""),
    [previous],
  );
  const after = useMemo(() => decodeBase64(selected.sourceBase64), [selected.sourceBase64]);
  const lines = useMemo(() => diffLines(before, after), [before, after]);

  return (
    <section aria-label="Changes in this post revision" className="post-revision-diff not-prose">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        <span>
          {previous
            ? `${previous.shortCommit} → ${selected.shortCommit}`
            : `initial publication · ${selected.shortCommit}`}
        </span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500/25" aria-hidden /> removed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500/25" aria-hidden /> added
          </span>
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/45 font-[family-name:var(--font-mono)] text-[12px] leading-5">
        {lines.map((line, index) => (
          <DiffRow key={`${index}-${line.kind}`} line={line} />
        ))}
      </div>
    </section>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const background =
    line.kind === "remove"
      ? "bg-red-500/12"
      : line.kind === "add"
        ? "bg-blue-500/12"
        : "";
  const marker = line.kind === "remove" ? "−" : line.kind === "add" ? "+" : " ";
  const markerColor =
    line.kind === "remove"
      ? "text-red-500"
      : line.kind === "add"
        ? "text-blue-500"
        : "text-[var(--color-ink-mute)]";

  return (
    <div
      className={`grid min-w-max grid-cols-[3.25rem_3.25rem_1.5rem_minmax(40rem,1fr)] border-b border-[var(--color-bg-2)]/45 last:border-b-0 ${background}`}
    >
      <span className="select-none px-2 text-right text-[var(--color-ink-mute)]/65">
        {line.oldNumber ?? ""}
      </span>
      <span className="select-none border-l border-[var(--color-bg-2)]/45 px-2 text-right text-[var(--color-ink-mute)]/65">
        {line.newNumber ?? ""}
      </span>
      <span className={`select-none border-l border-[var(--color-bg-2)]/45 text-center ${markerColor}`}>
        {marker}
      </span>
      <code className="whitespace-pre-wrap break-words border-l border-[var(--color-bg-2)]/45 px-2 text-[var(--color-ink)]">
        {line.text || " "}
      </code>
    </div>
  );
}
