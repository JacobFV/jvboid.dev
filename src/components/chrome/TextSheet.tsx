"use client";

import { useEffect, useState } from "react";
import { getContact } from "@/lib/contact-actions";
import { Sheet, sheetPrimary, sheetSecondary, sheetValue } from "./Sheet";

type State =
  | { kind: "loading" }
  | { kind: "ready"; phone: string; email: string }
  | { kind: "error"; error: string };

function smsHref(phone: string, body: string): string {
  // iOS uses `&body=`, Android uses `?body=` — `?body=` is the
  // historically-correct form and both platforms accept it now.
  return `sms:${phone.replace(/[^+\d]/g, "")}?body=${encodeURIComponent(body)}`;
}

function mailHref(email: string, body: string): string {
  const subject = encodeURIComponent("From your site");
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

const fmtSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

// The message the hero's ask bar hands over: what they typed and whatever
// they attached, and the ways to send it. `sms:` and `mailto:` links cannot
// carry files, so attachments go through the system share sheet where the
// browser can share files (phones, Safari, Chrome on Mac and Windows) —
// straight into Messages or Mail with the files already on. Elsewhere the
// sheet says plainly that the files have to be attached in the mail app.
export function TextSheet({
  open,
  message,
  files,
  onRemoveFile,
  onClose,
}: {
  open: boolean;
  message: string;
  files: File[];
  onRemoveFile: (index: number) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShareError(null);
    setState({ kind: "loading" });
    getContact().then((r) =>
      setState(r.ok ? { kind: "ready", phone: r.phone, email: r.email } : { kind: "error", error: r.error }),
    );
  }, [open]);

  useEffect(() => {
    setCanShareFiles(
      files.length > 0 && typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files })),
    );
  }, [files]);

  async function share() {
    setShareError(null);
    try {
      await navigator.share({ files, text: message, title: "For Jacob" });
      onClose();
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError; that is not a failure.
      if ((err as DOMException)?.name !== "AbortError") setShareError("Couldn't open the share sheet.");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Send Jacob a message">
      {message && (
        <blockquote className="m-0 border-l-2 border-[var(--color-accent)] pl-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-ink-dim)]">
          {message}
        </blockquote>
      )}

      {files.length > 0 && (
        <ul className={`${message ? "mt-4" : ""} border-y border-[var(--color-rule)]`}>
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 border-t border-[var(--color-rule)] py-2 font-[family-name:var(--font-mono)] text-xs first:border-t-0"
            >
              <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">{file.name}</span>
              <span className="shrink-0 text-[var(--color-ink-mute)]">{fmtSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={message || files.length ? "mt-5" : ""}>
        {state.kind === "loading" && (
          <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">…</p>
        )}
        {state.kind === "error" && <p className="text-sm text-[var(--color-accent)]">{state.error}</p>}
        {state.kind === "ready" && (
          <div className="flex flex-col gap-2">
            {canShareFiles && (
              <button type="button" onClick={share} className={sheetPrimary}>
                <span>Share with attachments</span>
                <span aria-hidden>→</span>
              </button>
            )}
            <a
              href={smsHref(state.phone, message)}
              onClick={onClose}
              className={canShareFiles ? sheetSecondary : sheetPrimary}
            >
              <span>Text</span>
              <span className={sheetValue}>{state.phone}</span>
            </a>
            <a href={mailHref(state.email, message)} onClick={onClose} className={sheetSecondary}>
              <span>Email</span>
              <span className={sheetValue}>{state.email}</span>
            </a>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-mute)]">
              {canShareFiles
                ? `Sharing opens your Messages or Mail with the files attached — send it to ${state.phone} or ${state.email}.`
                : files.length > 0
                  ? "Your mail app opens without the files — attach them there before sending."
                  : "On a desktop the text link may not open anywhere; use email."}
            </p>
            {shareError && <p className="text-xs text-[var(--color-accent)]">{shareError}</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
