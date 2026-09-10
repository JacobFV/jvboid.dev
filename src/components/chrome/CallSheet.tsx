"use client";

import { useEffect, useState } from "react";
import { getCallNumber } from "@/lib/contact-actions";
import { Sheet, sheetPrimary } from "./Sheet";

type State = { kind: "loading" } | { kind: "ready"; phone: string } | { kind: "error"; error: string };

// Tel-link sanitization: strip everything but digits and a leading +.
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function CallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;
    setState({ kind: "loading" });
    getCallNumber().then((r) =>
      setState(r.ok ? { kind: "ready", phone: r.phone } : { kind: "error", error: r.error }),
    );
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Call Jacob">
      {state.kind === "loading" && (
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">…</p>
      )}
      {state.kind === "error" && <p className="text-sm text-[var(--color-accent)]">{state.error}</p>}
      {state.kind === "ready" && (
        <div className="flex flex-col gap-5">
          <div className="font-[family-name:var(--font-mono)] text-2xl tracking-tight text-[var(--color-ink)]">
            {state.phone}
          </div>
          <a href={telHref(state.phone)} className={sheetPrimary}>
            <span>Call now</span>
            <span aria-hidden>→</span>
          </a>
        </div>
      )}
    </Sheet>
  );
}
