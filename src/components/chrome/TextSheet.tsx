"use client";

import { useEffect, useState } from "react";
import { newCallChallenge, revealContact } from "@/lib/contact-actions";

type State =
  | { kind: "loading" }
  | { kind: "ready"; prompt: string; token: string; error?: string }
  | { kind: "revealed"; phone: string; email: string };

function telDigits(phone: string): string {
  return phone.replace(/[^+\d]/g, "");
}

function smsHref(phone: string, body: string): string {
  // iOS uses `&body=`, Android uses `?body=` — `?body=` is the
  // historically-correct form and both platforms accept it now.
  return `sms:${telDigits(phone)}?body=${encodeURIComponent(body)}`;
}

function mailHref(email: string, body: string): string {
  const subject = encodeURIComponent("From your site");
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function TextSheet({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
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
    const result = await revealContact(state.token, answer);
    setBusy(false);
    if (result.ok) {
      setState({ kind: "revealed", phone: result.phone, email: result.email });
    } else {
      const next = await newCallChallenge();
      setAnswer("");
      setState({ kind: "ready", prompt: next.prompt, token: next.token, error: result.error });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send Jacob a message"
      className="fixed inset-0 z-50 grid place-items-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--color-bg-0)] p-6 shadow-[var(--shadow-soft),var(--ring-soft)]">
        <div className="mb-4">
          <div className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            Send Jacob a message
          </div>
          <div className="text-xs text-[var(--color-ink-mute)]">
            {state.kind === "revealed"
              ? "Pick the channel that's easiest for you."
              : "Quick human check first, then your message is ready."}
          </div>
        </div>

        {/* Echo back what they typed so they can verify before sending. */}
        {message && (
          <div className="mb-4 rounded-2xl bg-[var(--color-bg-1)] px-4 py-3 text-sm whitespace-pre-wrap text-[var(--color-ink-dim)]">
            {message}
          </div>
        )}

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
            <label className="text-sm text-[var(--color-ink-dim)]">{state.prompt}</label>
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
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            >
              {busy ? "Checking…" : "Show send options"}
            </button>
          </form>
        )}

        {state.kind === "revealed" && (
          <div className="flex flex-col gap-3">
            <a
              href={smsHref(state.phone, message)}
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-center text-sm font-medium text-white no-underline"
              style={{ background: "var(--color-phone)" }}
            >
              Send as text → {state.phone}
            </a>
            <a
              href={mailHref(state.email, message)}
              onClick={onClose}
              className="rounded-full bg-[var(--color-bg-1)] px-5 py-2.5 text-center text-sm font-medium text-[var(--color-ink)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)]"
            >
              Send as email → {state.email}
            </a>
            <p className="text-center text-xs text-[var(--color-ink-mute)]">
              On desktop the SMS link may not open anywhere — use email instead.
            </p>
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
