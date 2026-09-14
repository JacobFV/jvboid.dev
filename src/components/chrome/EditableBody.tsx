"use client";

import { useEffect } from "react";
import type { EditTarget } from "@/lib/edit-types";
import { useEditor } from "./EditProvider";

// Wraps the prose of an entry that can be edited in place. It offers the page
// up to the header — that is what makes the pencil appear — and swaps itself
// for a textarea when the pencil is pressed.
//
// A page that never renders one of these (a listing, a redirect, a paper that
// bounces to its PDF) simply has nothing to edit, and the header's control
// stays hidden. That is the whole gate on *what* is editable.

export function EditableBody({
  scope,
  id,
  title,
  children,
}: EditTarget & { children: React.ReactNode }) {
  const { registerTarget, target, mode, draft, setDraft, path } = useEditor();

  useEffect(
    () => registerTarget({ scope, id, title }),
    [registerTarget, scope, id, title],
  );

  const editing = target?.id === id && (mode === "editing" || mode === "saving");
  if (!editing) return <>{children}</>;

  return (
    <div>
      <p className="mb-2 font-[family-name:var(--font-mono)] text-[0.62rem] tracking-[0.12em] text-[var(--color-ink-mute)]">
        {path ?? "…"}
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={mode === "saving"}
        spellCheck
        aria-label={`Body of ${title}`}
        className="block min-h-[60vh] w-full resize-y border border-[var(--color-rule)] bg-transparent p-4 font-[family-name:var(--font-mono)] text-[0.82rem] leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-50"
      />
      <p className="mt-2 font-[family-name:var(--font-mono)] text-[0.62rem] tracking-[0.12em] text-[var(--color-ink-mute)] uppercase">
        Body only — frontmatter is kept as it is
      </p>
    </div>
  );
}
