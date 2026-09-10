"use client";

import { useEffect, useState } from "react";
import { getContact } from "@/lib/contact-actions";
import { CONTACT_SEND_URL } from "@/lib/contact-endpoint";
import { Sheet, sheetPrimary, sheetSecondary, sheetValue } from "./Sheet";

type Contact =
  | { kind: "loading" }
  | { kind: "ready"; phone: string; email: string }
  | { kind: "error"; error: string };

type Send =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; reply: string }
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
// they attached. "Send to Jacob" posts it to the contact Worker
// (workers/contact), which emails it with the attachments on, and asks for
// a reply address so the answer has somewhere to go. Texting or emailing it
// yourself stays underneath as the fallback — words only, since sms: and
// mailto: links cannot carry files.
export function TextSheet({
  open,
  message,
  files,
  onRemoveFile,
  onSent,
  onClose,
}: {
  open: boolean;
  message: string;
  files: File[];
  onRemoveFile: (index: number) => void;
  /** Clears the ask bar once the message has gone. */
  onSent: () => void;
  onClose: () => void;
}) {
  const [contact, setContact] = useState<Contact>({ kind: "loading" });
  const [send, setSend] = useState<Send>({ kind: "idle" });
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (!open) return;
    setSend({ kind: "idle" });
    setContact({ kind: "loading" });
    getContact().then((r) =>
      setContact(r.ok ? { kind: "ready", phone: r.phone, email: r.email } : { kind: "error", error: r.error }),
    );
  }, [open]);

  async function deliver() {
    if (send.kind === "sending") return;
    setSend({ kind: "sending" });
    const form = new FormData();
    form.set("message", message);
    form.set("reply", reply);
    for (const file of files) form.append("files", file);
    try {
      const res = await fetch(CONTACT_SEND_URL, { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setSend({ kind: "sent", reply: reply.trim() });
        onSent();
      } else {
        setSend({ kind: "error", error: body?.error ?? "The message couldn't be sent." });
      }
    } catch {
      setSend({ kind: "error", error: "The message couldn't be sent — check your connection." });
    }
  }

  if (send.kind === "sent") {
    return (
      <Sheet open={open} onClose={onClose} title="Sent">
        <p className="text-sm leading-relaxed text-[var(--color-ink)]">
          On its way — Jacob gets it by email
          {send.reply ? `, and can reply to ${send.reply}.` : "."}
        </p>
        <button type="button" onClick={onClose} className={`${sheetSecondary} mt-5`}>
          <span>Close</span>
          <span aria-hidden>×</span>
        </button>
      </Sheet>
    );
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

      <form
        className={message || files.length ? "mt-5" : ""}
        onSubmit={(e) => {
          e.preventDefault();
          void deliver();
        }}
      >
        <label className="block font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.12em] text-[var(--color-ink-mute)] uppercase">
          Your email or phone, so Jacob can reply
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            autoComplete="email"
            placeholder="optional"
            className="mt-1.5 block w-full border border-[var(--color-rule)] bg-transparent px-3 py-2.5 font-[family-name:var(--font-sans)] text-sm tracking-normal text-[var(--color-ink)] normal-case outline-none placeholder:text-[var(--color-ink-mute)] focus:border-[var(--color-ink)]"
          />
        </label>
        <button type="submit" disabled={send.kind === "sending"} className={`${sheetPrimary} mt-3`}>
          <span>{send.kind === "sending" ? "Sending…" : "Send to Jacob"}</span>
          <span aria-hidden>→</span>
        </button>
        {send.kind === "error" && (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{send.error}</p>
        )}
      </form>

      <div className="mt-6">
        <p className="mb-2 font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.12em] text-[var(--color-ink-mute)] uppercase">
          Or send it yourself
        </p>
        {contact.kind === "loading" && (
          <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">…</p>
        )}
        {contact.kind === "error" && (
          <p className="text-sm text-[var(--color-accent)]">{contact.error}</p>
        )}
        {contact.kind === "ready" && (
          <div className="flex flex-col gap-2">
            <a href={smsHref(contact.phone, message)} onClick={onClose} className={sheetSecondary}>
              <span>Text</span>
              <span className={sheetValue}>
                {contact.phone}
                {files.length > 0 && " · words only"}
              </span>
            </a>
            <a href={mailHref(contact.email, message)} onClick={onClose} className={sheetSecondary}>
              <span>Email</span>
              <span className={sheetValue}>
                {contact.email}
                {files.length > 0 && " · words only"}
              </span>
            </a>
            {files.length > 0 && (
              <p className="mt-1 border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-relaxed text-[var(--color-ink)]">
                Text and Email send your words only — your{" "}
                {files.length === 1 ? "attachment won't" : "attachments won't"} go with them. Send
                to Jacob above to include them.
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
