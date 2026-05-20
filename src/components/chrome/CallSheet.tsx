"use client";

import { useEffect, useState } from "react";
import { newCallChallenge, revealCallNumber } from "@/lib/contact-actions";

type State =
  | { kind: "loading" }
  | { kind: "ready"; prompt: string; token: string; error?: string }
  | { kind: "revealed"; phone: string };

// Tel-link sanitization: strip everything but digits and a leading +.
function telHref(phone: string): string {
  const cleaned = phone.replace(/[^+\d]/g, "");
  return `tel:${cleaned}`;
}

export function CallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAnswer("");
    setState({ kind: "loading" });
    newCallChallenge().then((c) =>
      setState({ kind: "ready", prompt: c.prompt, token: c.token }),
    );
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (state.kind !== "ready" || busy) return;
    setBusy(true);
    const result = await revealCallNumber(state.token, answer);
    setBusy(false);
    if (result.ok) {
      setState({ kind: "revealed", phone: result.phone });
    } else {
      // Refresh the challenge on every failed attempt so a brute-force
      // attacker has to re-solve each time, not just iterate answers.
      const next = await newCallChallenge();
      setAnswer("");
      setState({ kind: "ready", prompt: next.prompt, token: next.token, error: result.error });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Call Jacob"
      className="fixed inset-0 z-50 grid place-items-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--color-bg-0)] p-6 shadow-[var(--shadow-soft),var(--ring-soft)]">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-white"
            style={{ background: "var(--color-phone)" }}
            aria-hidden
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <div>
            <div className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
              Call Jacob
            </div>
            <div className="text-xs text-[var(--color-ink-mute)]">
              {state.kind === "revealed"
                ? "Connected on first ring."
                : "Quick human check first."}
            </div>
          </div>
        </div>

        {state.kind === "loading" && (
          <p className="text-sm text-[var(--color-ink-dim)]">Loading…</p>
        )}

        {state.kind === "ready" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex flex-col gap-3"
          >
            <label className="text-sm text-[var(--color-ink-dim)]">
              {state.prompt}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="rounded-full bg-[var(--color-bg-1)] px-5 py-2.5 text-base text-[var(--color-ink)] shadow-[var(--ring-soft)] outline-none placeholder:text-[var(--color-ink-mute)] focus:shadow-[inset_0_0_0_1px_var(--color-accent)]"
              placeholder="answer"
            />
            {state.error && (
              <p className="text-xs text-[var(--color-accent)]">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={busy || answer.trim().length === 0}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-phone)" }}
            >
              {busy ? "Checking…" : "Show number"}
            </button>
          </form>
        )}

        {state.kind === "revealed" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-[var(--color-bg-1)] px-5 py-4 text-center font-[family-name:var(--font-mono)] text-xl text-[var(--color-ink)]">
              {state.phone}
            </div>
            <a
              href={telHref(state.phone)}
              className="rounded-full px-5 py-2.5 text-center text-sm font-medium text-white no-underline"
              style={{ background: "var(--color-phone)" }}
            >
              Call now
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
            >
              close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
