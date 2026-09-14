"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadSource, saveSource } from "@/lib/content-actions";
import type { EditTarget } from "@/lib/edit-types";

// The editor's shared state, sitting above both the header and the page so
// the pencil in one can drive the textarea in the other. They are already in
// a single React tree — the layout wraps its children — so this is a plain
// context and nothing about it makes a page dynamic.
//
// What it knows: whether Jacob is signed in, which entry the current page has
// offered up as editable, and what he has typed into it so far.

type Mode = "idle" | "loading" | "editing" | "saving";
type Status = { kind: "error" | "done"; text: string } | null;

type EditContext = {
  signedIn: boolean;
  /** The entry this page offers for editing, if any. */
  target: EditTarget | null;
  mode: Mode;
  draft: string;
  /** The file being edited, once it has been fetched. */
  path: string | null;
  status: Status;
  setDraft: (value: string) => void;
  begin: () => void;
  cancel: () => void;
  save: () => void;
  /** Called by EditableBody. Returns its own cleanup. */
  registerTarget: (target: EditTarget) => () => void;
};

const Ctx = createContext<EditContext | null>(null);

export function useEditor(): EditContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useEditor outside EditProvider");
  return value;
}

/** The readable companion cookie set alongside the real session. */
function hasEditorCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim() === "jv_editor=1");
}

export function EditProvider({ children }: { children: React.ReactNode }) {
  // Read in an effect, not during render: the server has no idea whether this
  // visitor is signed in (that is the whole point — every page stays static),
  // so the first paint must match the server's, pencil-less, and the control
  // appears a tick later.
  const [signedIn, setSignedIn] = useState(false);
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const sha = useRef<string>("");

  useEffect(() => setSignedIn(hasEditorCookie()), []);

  const reset = useCallback(() => {
    setMode("idle");
    setDraft("");
    setPath(null);
    sha.current = "";
  }, []);

  const registerTarget = useCallback(
    (next: EditTarget) => {
      setTarget(next);
      setStatus(null);
      return () => {
        // Navigating away mid-edit drops the draft. The alternative is
        // restoring it onto a page that may be a different entry entirely,
        // which is worse than losing a paragraph you can see you lost.
        setTarget((current) => (current === next ? null : current));
        reset();
      };
    },
    [reset],
  );

  const begin = useCallback(() => {
    if (!target) return;
    setStatus(null);
    setMode("loading");
    void loadSource(target.scope, target.id).then((result) => {
      if (!result.ok) {
        setMode("idle");
        setStatus({ kind: "error", text: result.error });
        return;
      }
      sha.current = result.sha;
      setPath(result.path);
      setDraft(result.body);
      setMode("editing");
    });
  }, [target]);

  const cancel = useCallback(() => {
    reset();
    setStatus(null);
  }, [reset]);

  const save = useCallback(() => {
    if (!target || mode !== "editing") return;
    setMode("saving");
    void saveSource(target.scope, target.id, draft, sha.current).then((result) => {
      if (!result.ok) {
        setMode("editing");
        setStatus({ kind: "error", text: result.error });
        return;
      }
      reset();
      // The page on screen was compiled by velite at build time, so it cannot
      // update in place — say what actually happens instead of pretending.
      setStatus({ kind: "done", text: `Committed ${result.commit} — rebuilding, refresh shortly.` });
    });
  }, [target, mode, draft, reset]);

  const value = useMemo<EditContext>(
    () => ({
      signedIn,
      target,
      mode,
      draft,
      path,
      status,
      setDraft,
      begin,
      cancel,
      save,
      registerTarget,
    }),
    [signedIn, target, mode, draft, path, status, begin, cancel, save, registerTarget],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
